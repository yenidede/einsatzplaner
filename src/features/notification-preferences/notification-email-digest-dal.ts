import { Prisma } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import { emailService } from '@/lib/email/EmailService';
import type {
  DigestInterval,
  DigestTime,
  EffectiveNotificationSettings,
  MinimumPriority,
} from './types';
import {
  computeNextDigestDispatchAt,
  resolveNotificationEmailDelivery,
} from './notification-email-routing';
import { getEffectiveNotificationSettingsForUsers } from './notification-preferences-dal';

type SqlExecutor = Prisma.TransactionClient | typeof prisma;

export type NotificationDigestEventType = 'einsatz_requirements_warning';

type DigestQueueRow = {
  id: string;
  userId: string;
  organizationId: string;
  priority: string;
  digestInterval: string;
  eventType: string;
  payloadJson: Prisma.JsonValue;
};

type EinsatzRequirementsWarningPayload = {
  einsatzId: string;
  einsatzTitle: string;
  einsatzStartIso: string;
  warningLines: string[];
  einsatzUrl: string;
};

function isDigestInterval(value: string): value is DigestInterval {
  return value === 'daily' || value === 'every_2_days';
}

function isMinimumPriority(value: string): value is MinimumPriority {
  return value === 'info' || value === 'review' || value === 'critical';
}

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEinsatzRequirementsWarningPayload(
  payload: Prisma.JsonValue
): EinsatzRequirementsWarningPayload | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  const einsatzId = payload.einsatzId;
  const einsatzTitle = payload.einsatzTitle;
  const einsatzStartIso = payload.einsatzStartIso;
  const warningLines = payload.warningLines;
  const einsatzUrl = payload.einsatzUrl;

  if (
    typeof einsatzId !== 'string' ||
    typeof einsatzTitle !== 'string' ||
    typeof einsatzStartIso !== 'string' ||
    typeof einsatzUrl !== 'string'
  ) {
    return null;
  }

  if (!Array.isArray(warningLines)) {
    return null;
  }

  const normalizedWarningLines = warningLines.filter(
    (line): line is string => typeof line === 'string' && line.trim().length > 0
  );

  if (normalizedWarningLines.length === 0) {
    return null;
  }

  return {
    einsatzId,
    einsatzTitle,
    einsatzStartIso,
    warningLines: normalizedWarningLines,
    einsatzUrl,
  };
}

function normalizeSchemaError(error: unknown): never {
  if (
    error instanceof Error &&
    (error.message.includes('relation') || error.message.includes('column')) &&
    error.message.includes('does not exist')
  ) {
    throw new Error(
      'Das Sammelmail-Datenmodell ist noch nicht in der Datenbank vorhanden. Bitte führen Sie docs/sql/notification-digest-queue.sql in Ihrer Datenbank aus.'
    );
  }

  throw error;
}

export function isDigestQueueSchemaMissingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Sammelmail-Datenmodell') &&
    error.message.includes('notification-digest-queue.sql')
  );
}

export async function enqueueNotificationDigestItem(
  input: {
    userId: string;
    organizationId: string;
    priority: MinimumPriority;
    digestInterval: DigestInterval;
    digestTime: DigestTime;
    digestSecondTime: DigestTime;
    eventType: NotificationDigestEventType;
    payload: Prisma.JsonValue;
    dedupeKey: string;
  },
  executor: SqlExecutor = prisma
): Promise<void> {
  const now = new Date();
  const scheduledFor = computeNextDigestDispatchAt({
    now,
    digestInterval: input.digestInterval,
    digestTime: input.digestTime,
    digestSecondTime: input.digestSecondTime,
  });

  try {
    await executor.$executeRaw(Prisma.sql`
      INSERT INTO notification_email_digest_queue (
        user_id,
        organization_id,
        priority,
        digest_interval,
        event_type,
        payload_json,
        dedupe_key,
        scheduled_for,
        created_at
      )
      VALUES (
        CAST(${input.userId} AS UUID),
        CAST(${input.organizationId} AS UUID),
        ${input.priority},
        ${input.digestInterval},
        ${input.eventType},
        CAST(${JSON.stringify(input.payload)} AS JSONB),
        ${input.dedupeKey},
        ${scheduledFor},
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
  } catch (error) {
    normalizeSchemaError(error);
  }
}

type ProcessDigestResult = {
  queuedItems: number;
  sentItems: number;
  skippedItems: number;
};

function buildDigestGroupKey(userId: string, organizationId: string): string {
  return `${organizationId}:${userId}`;
}

function toUuidSqlFragment(value: string) {
  return Prisma.sql`CAST(${value} AS UUID)`;
}

async function markQueueRowsAsSent(
  input: {
    ids: string[];
    messageId: string | null;
    sendError: string | null;
  },
  executor: SqlExecutor
) {
  if (input.ids.length === 0) {
    return;
  }

  const idFragments = input.ids.map((id) => toUuidSqlFragment(id));
  await executor.$executeRaw(Prisma.sql`
    UPDATE notification_email_digest_queue
    SET
      sent_at = NOW(),
      message_id = ${input.messageId},
      send_error = ${input.sendError}
    WHERE id IN (${Prisma.join(idFragments)})
  `);
}

async function markQueueRowsWithError(
  input: {
    ids: string[];
    sendError: string;
  },
  executor: SqlExecutor
) {
  if (input.ids.length === 0) {
    return;
  }

  const idFragments = input.ids.map((id) => toUuidSqlFragment(id));
  await executor.$executeRaw(Prisma.sql`
    UPDATE notification_email_digest_queue
    SET
      sent_at = NOW(),
      message_id = NULL,
      send_error = ${input.sendError}
    WHERE id IN (${Prisma.join(idFragments)})
  `);
}

type PendingDigestSend = {
  rowIds: string[];
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  digestInterval: DigestInterval;
  entries: Array<{
    einsatzTitle: string;
    einsatzStart: Date;
    warningLines: string[];
    einsatzUrl: string;
  }>;
};

type ProcessDigestPreparationResult = {
  queuedItems: number;
  skippedItems: number;
  pendingSends: PendingDigestSend[];
};

export async function processNotificationDigestQueue(
  input: { limit?: number } = {}
): Promise<ProcessDigestResult> {
  const limit = input.limit ?? 250;

  try {
    const prepared = await prisma.$transaction<ProcessDigestPreparationResult>(
      async (tx) => {
        const rows = await tx.$queryRaw<DigestQueueRow[]>(Prisma.sql`
          SELECT
            id,
            user_id AS "userId",
            organization_id AS "organizationId",
            priority,
            digest_interval AS "digestInterval",
            event_type AS "eventType",
            payload_json AS "payloadJson"
          FROM notification_email_digest_queue
          WHERE sent_at IS NULL
            AND scheduled_for <= NOW()
          ORDER BY scheduled_for ASC, created_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        `);

        if (rows.length === 0) {
          return {
            queuedItems: 0,
            skippedItems: 0,
            pendingSends: [],
          };
        }

        const orgIds = Array.from(new Set(rows.map((row) => row.organizationId)));
        const userIds = Array.from(new Set(rows.map((row) => row.userId)));

        const memberships = await tx.user_organization_role.findMany({
          where: {
            org_id: { in: orgIds },
            user_id: { in: userIds },
          },
          select: {
            org_id: true,
            user_id: true,
            user: {
              select: {
                email: true,
                firstname: true,
                lastname: true,
              },
            },
            organization: {
              select: {
                name: true,
              },
            },
          },
        });

        const membershipByKey = new Map<
          string,
          {
            organizationName: string;
            userEmail: string | null;
            userDisplayName: string;
          }
        >();

        for (const membership of memberships) {
          membershipByKey.set(
            buildDigestGroupKey(membership.user_id, membership.org_id),
            {
              organizationName: membership.organization.name,
              userEmail: membership.user.email,
              userDisplayName: [membership.user.firstname, membership.user.lastname]
                .filter((value): value is string => typeof value === 'string')
                .join(' ')
                .trim(),
            }
          );
        }

        const settingsByOrgId = new Map<
          string,
          Map<string, EffectiveNotificationSettings>
        >();

        for (const orgId of orgIds) {
          const orgUserIds = Array.from(
            new Set(
              rows
                .filter((row) => row.organizationId === orgId)
                .map((row) => row.userId)
            )
          );

          const settings = await getEffectiveNotificationSettingsForUsers({
            organizationId: orgId,
            userIds: orgUserIds,
            executor: tx,
          });

          settingsByOrgId.set(orgId, settings);
        }

        const rowsByGroup = new Map<string, DigestQueueRow[]>();
        for (const row of rows) {
          const key = buildDigestGroupKey(row.userId, row.organizationId);
          const currentRows = rowsByGroup.get(key) ?? [];
          currentRows.push(row);
          rowsByGroup.set(key, currentRows);
        }

        let skippedItems = 0;
        const pendingSends: PendingDigestSend[] = [];

        for (const [groupKey, groupRows] of rowsByGroup.entries()) {
          const firstRow = groupRows[0];
          const membership = membershipByKey.get(groupKey);

          if (!membership?.userEmail) {
            skippedItems += groupRows.length;
            await markQueueRowsAsSent(
              {
                ids: groupRows.map((row) => row.id),
                messageId: null,
                sendError:
                  'Sammelmail übersprungen, da keine gültige Empfängeradresse vorhanden ist.',
              },
              tx
            );
            continue;
          }

          const orgSettings = settingsByOrgId.get(firstRow.organizationId);
          const effectiveSettings = orgSettings?.get(firstRow.userId);

          if (!effectiveSettings) {
            skippedItems += groupRows.length;
            await markQueueRowsAsSent(
              {
                ids: groupRows.map((row) => row.id),
                messageId: null,
                sendError:
                  'Sammelmail übersprungen, da keine Benachrichtigungseinstellung aufgelöst werden konnte.',
              },
              tx
            );
            continue;
          }

          const digestEntries: Array<{
            rowId: string;
            einsatzTitle: string;
            einsatzStart: Date;
            warningLines: string[];
            einsatzUrl: string;
          }> = [];
          const skippedRowIds: string[] = [];

          for (const row of groupRows) {
            if (!isMinimumPriority(row.priority)) {
              skippedRowIds.push(row.id);
              continue;
            }

            const delivery = resolveNotificationEmailDelivery({
              effective: effectiveSettings,
              eventPriority: row.priority,
            });

            if (delivery !== 'digest') {
              skippedRowIds.push(row.id);
              continue;
            }

            if (
              row.eventType !== 'einsatz_requirements_warning' ||
              !isDigestInterval(row.digestInterval)
            ) {
              skippedRowIds.push(row.id);
              continue;
            }

            const payload = parseEinsatzRequirementsWarningPayload(row.payloadJson);
            if (!payload) {
              skippedRowIds.push(row.id);
              continue;
            }

            const einsatzStart = new Date(payload.einsatzStartIso);
            if (Number.isNaN(einsatzStart.getTime())) {
              skippedRowIds.push(row.id);
              continue;
            }

            digestEntries.push({
              rowId: row.id,
              einsatzTitle: payload.einsatzTitle,
              einsatzStart,
              warningLines: payload.warningLines,
              einsatzUrl: payload.einsatzUrl,
            });
          }

          if (skippedRowIds.length > 0) {
            skippedItems += skippedRowIds.length;
            await markQueueRowsAsSent(
              {
                ids: skippedRowIds,
                messageId: null,
                sendError:
                  'Sammelmail-Eintrag wurde übersprungen, da die Einstellung oder Nutzdaten nicht mehr passen.',
              },
              tx
            );
          }

          if (digestEntries.length === 0) {
            continue;
          }

          const sendRowIds = digestEntries.map((entry) => entry.rowId);
          await markQueueRowsAsSent(
            {
              ids: sendRowIds,
              messageId: null,
              sendError: 'Sammelmail-Versand gestartet.',
            },
            tx
          );

          const groupDigestInterval = isDigestInterval(firstRow.digestInterval)
            ? firstRow.digestInterval
            : effectiveSettings.digestInterval;

          pendingSends.push({
            rowIds: sendRowIds,
            recipientEmail: membership.userEmail,
            recipientName:
              membership.userDisplayName.length > 0
                ? membership.userDisplayName
                : 'Sie',
            organizationName: membership.organizationName,
            digestInterval: groupDigestInterval,
            entries: digestEntries.map((entry) => ({
              einsatzTitle: entry.einsatzTitle,
              einsatzStart: entry.einsatzStart,
              warningLines: entry.warningLines,
              einsatzUrl: entry.einsatzUrl,
            })),
          });
        }

        return {
          queuedItems: rows.length,
          skippedItems,
          pendingSends,
        };
      }
    );

    if (prepared.queuedItems === 0) {
      return {
        queuedItems: 0,
        sentItems: 0,
        skippedItems: 0,
      };
    }

    let sentItems = 0;

    for (const pendingSend of prepared.pendingSends) {
      try {
        const info = await emailService.sendNotificationDigestEmail({
          recipientEmail: pendingSend.recipientEmail,
          recipientName: pendingSend.recipientName,
          organizationName: pendingSend.organizationName,
          digestInterval: pendingSend.digestInterval,
          entries: pendingSend.entries,
        });

        sentItems += pendingSend.rowIds.length;
        await markQueueRowsAsSent(
          {
            ids: pendingSend.rowIds,
            messageId: info?.messageId ?? null,
            sendError: null,
          },
          prisma
        );
      } catch (error) {
        await markQueueRowsWithError(
          {
            ids: pendingSend.rowIds,
            sendError:
              error instanceof Error
                ? error.message
                : 'Unbekannter Fehler beim Sammelmail-Versand.',
          },
          prisma
        );
      }
    }

    return {
      queuedItems: prepared.queuedItems,
      sentItems,
      skippedItems: prepared.skippedItems,
    };
  } catch (error) {
    normalizeSchemaError(error);
  }
}
