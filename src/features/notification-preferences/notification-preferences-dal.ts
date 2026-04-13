import { Prisma } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import {
  NOTIFICATION_DEFAULTS,
} from './constants';
import {
  buildNotificationPreferenceSummary,
  deriveLegacyFromRules,
  deriveRulesFromLegacy,
  getPreferenceSource,
  isGeneralDeliveryMode,
  isImportantDeliveryMode,
  isUrgentDeliveryMode,
  isDigestTime,
  resolveEffectiveNotificationSettings,
} from './notification-preferences-utils';
import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  EffectiveNotificationSettings,
  MinimumPriority,
  OrganizationNotificationCardData,
  OrganizationNotificationDefaults,
  UserOrganizationNotificationPreference,
} from './types';

type SqlExecutor = Prisma.TransactionClient | typeof prisma;

type OrganizationDefaultsRow = {
  organizationId: string;
  emailEnabledDefault: boolean | null;
  deliveryModeDefault: string | null;
  minimumPriorityDefault: string | null;
  urgentDeliveryDefault: string | null;
  importantDeliveryDefault: string | null;
  generalDeliveryDefault: string | null;
  digestIntervalDefault: string | null;
  digestTimeDefault: string | null;
  digestSecondTimeDefault: string | null;
};

type UserPreferenceRow = {
  preferenceId: string | null;
  userId: string | null;
  organizationId: string;
  useOrganizationDefaults: boolean | null;
  emailEnabled: boolean | null;
  deliveryMode: string | null;
  minimumPriority: string | null;
  urgentDelivery: string | null;
  importantDelivery: string | null;
  generalDelivery: string | null;
  digestInterval: string | null;
  digestTime: string | null;
  digestSecondTime: string | null;
};

type UserPreferenceBatchRow = {
  userId: string;
  useOrganizationDefaults: boolean | null;
  emailEnabled: boolean | null;
  deliveryMode: string | null;
  minimumPriority: string | null;
  urgentDelivery: string | null;
  importantDelivery: string | null;
  generalDelivery: string | null;
  digestInterval: string | null;
  digestTime: string | null;
  digestSecondTime: string | null;
};

type NotificationCardRow = OrganizationDefaultsRow &
  UserPreferenceRow & {
    organizationName: string;
  };

function coerceDeliveryMode(
  value: string | null | undefined,
  fallback: DeliveryMode
): DeliveryMode {
  if (
    value === 'critical_only' ||
    value === 'digest_only' ||
    value === 'critical_and_digest'
  ) {
    return value;
  }

  return fallback;
}

function coerceMinimumPriority(
  value: string | null | undefined,
  fallback: MinimumPriority
): MinimumPriority {
  if (value === 'info' || value === 'review' || value === 'critical') {
    return value;
  }

  return fallback;
}

function coerceDigestInterval(
  value: string | null | undefined,
  fallback: DigestInterval
): DigestInterval {
  if (
    value === 'daily' ||
    value === 'every_2_days'
  ) {
    return value;
  }

  return fallback;
}

function coerceDigestTime(
  value: string | null | undefined,
  fallback: DigestTime
): DigestTime {
  if (value && isDigestTime(value)) {
    return value;
  }

  return fallback;
}

function mapDefaultsRow(
  row: OrganizationDefaultsRow | null,
  organizationId: string
): OrganizationNotificationDefaults {
  const deliveryModeDefault = coerceDeliveryMode(
    row?.deliveryModeDefault,
    NOTIFICATION_DEFAULTS.deliveryModeDefault
  );
  const minimumPriorityDefault = coerceMinimumPriority(
    row?.minimumPriorityDefault,
    NOTIFICATION_DEFAULTS.minimumPriorityDefault
  );
  const fallbackRules = deriveRulesFromLegacy({
    deliveryMode: deliveryModeDefault,
    minimumPriority: minimumPriorityDefault,
  });

  return {
    organizationId,
    emailEnabledDefault:
      row?.emailEnabledDefault ?? NOTIFICATION_DEFAULTS.emailEnabledDefault,
    deliveryModeDefault,
    minimumPriorityDefault,
    urgentDeliveryDefault:
      row?.urgentDeliveryDefault &&
      isUrgentDeliveryMode(row.urgentDeliveryDefault)
        ? row.urgentDeliveryDefault
        : fallbackRules.urgentDelivery,
    importantDeliveryDefault:
      row?.importantDeliveryDefault &&
      isImportantDeliveryMode(row.importantDeliveryDefault)
        ? row.importantDeliveryDefault
        : fallbackRules.importantDelivery,
    generalDeliveryDefault:
      row?.generalDeliveryDefault &&
      isGeneralDeliveryMode(row.generalDeliveryDefault)
        ? row.generalDeliveryDefault
        : fallbackRules.generalDelivery,
    digestIntervalDefault: coerceDigestInterval(
      row?.digestIntervalDefault,
      NOTIFICATION_DEFAULTS.digestIntervalDefault
    ),
    digestTimeDefault: coerceDigestTime(
      row?.digestTimeDefault,
      NOTIFICATION_DEFAULTS.digestTimeDefault
    ),
    digestSecondTimeDefault: coerceDigestTime(
      row?.digestSecondTimeDefault,
      NOTIFICATION_DEFAULTS.digestSecondTimeDefault
    ),
  };
}

function mapUserPreferenceRow(
  row: UserPreferenceRow,
  defaults?: OrganizationNotificationDefaults
): UserOrganizationNotificationPreference | null {
  if (!row.preferenceId || !row.userId) {
    return null;
  }

  const deliveryModeFallback =
    defaults?.deliveryModeDefault ?? NOTIFICATION_DEFAULTS.deliveryModeDefault;
  const minimumPriorityFallback =
    defaults?.minimumPriorityDefault ?? NOTIFICATION_DEFAULTS.minimumPriorityDefault;
  const digestIntervalFallback =
    defaults?.digestIntervalDefault ?? NOTIFICATION_DEFAULTS.digestIntervalDefault;
  const digestTimeFallback =
    defaults?.digestTimeDefault ?? NOTIFICATION_DEFAULTS.digestTimeDefault;
  const digestSecondTimeFallback =
    defaults?.digestSecondTimeDefault ?? NOTIFICATION_DEFAULTS.digestSecondTimeDefault;

  const deliveryMode =
    row.deliveryMode === null
      ? null
      : coerceDeliveryMode(row.deliveryMode, deliveryModeFallback);
  const minimumPriority =
    row.minimumPriority === null
      ? null
      : coerceMinimumPriority(row.minimumPriority, minimumPriorityFallback);

  const fallbackRules = deriveRulesFromLegacy({
    deliveryMode: deliveryMode ?? deliveryModeFallback,
    minimumPriority: minimumPriority ?? minimumPriorityFallback,
  });

  return {
    userId: row.userId,
    organizationId: row.organizationId,
    useOrganizationDefaults: row.useOrganizationDefaults ?? true,
    emailEnabled: row.emailEnabled,
    deliveryMode,
    minimumPriority,
    urgentDelivery:
      row.urgentDelivery === null
        ? null
        : isUrgentDeliveryMode(row.urgentDelivery)
          ? row.urgentDelivery
          : fallbackRules.urgentDelivery,
    importantDelivery:
      row.importantDelivery === null
        ? null
        : isImportantDeliveryMode(row.importantDelivery)
          ? row.importantDelivery
          : fallbackRules.importantDelivery,
    generalDelivery:
      row.generalDelivery === null
        ? null
        : isGeneralDeliveryMode(row.generalDelivery)
          ? row.generalDelivery
          : fallbackRules.generalDelivery,
    digestInterval:
      row.digestInterval === null
        ? null
        : coerceDigestInterval(row.digestInterval, digestIntervalFallback),
    digestTime:
      row.digestTime === null
        ? null
        : coerceDigestTime(row.digestTime, digestTimeFallback),
    digestSecondTime:
      row.digestSecondTime === null
        ? null
        : coerceDigestTime(row.digestSecondTime, digestSecondTimeFallback),
  };
}

export async function isUserInOrganization(
  userId: string,
  organizationId: string,
  executor: SqlExecutor = prisma
): Promise<boolean> {
  const rows = await executor.$queryRaw<Array<{ exists: number }>>(
    Prisma.sql`
      SELECT 1 AS exists
      FROM user_organization_role
      WHERE user_id = CAST(${userId} AS UUID)
        AND org_id = CAST(${organizationId} AS UUID)
      LIMIT 1
    `
  );

  return rows.length > 0;
}

export async function getOrganizationNotificationDefaults(
  organizationId: string,
  executor: SqlExecutor = prisma
): Promise<OrganizationNotificationDefaults> {
  const rows = await executor.$queryRaw<OrganizationDefaultsRow[]>(Prisma.sql`
    SELECT
      organization_id AS "organizationId",
      email_enabled_default AS "emailEnabledDefault",
      delivery_mode_default AS "deliveryModeDefault",
      minimum_priority_default AS "minimumPriorityDefault",
      urgent_delivery_default AS "urgentDeliveryDefault",
      important_delivery_default AS "importantDeliveryDefault",
      general_delivery_default AS "generalDeliveryDefault",
      digest_interval_default AS "digestIntervalDefault",
      TO_CHAR(digest_time_default, 'HH24:MI') AS "digestTimeDefault",
      TO_CHAR(digest_second_time_default, 'HH24:MI') AS "digestSecondTimeDefault"
    FROM organization_notification_settings
    WHERE organization_id = CAST(${organizationId} AS UUID)
    LIMIT 1
  `);

  return mapDefaultsRow(rows[0] ?? null, organizationId);
}

export async function getUserOrganizationNotificationPreference(
  userId: string,
  organizationId: string,
  executor: SqlExecutor = prisma,
  defaults?: OrganizationNotificationDefaults
): Promise<UserOrganizationNotificationPreference | null> {
  const rows = await executor.$queryRaw<UserPreferenceRow[]>(Prisma.sql`
    SELECT
      id AS "preferenceId",
      user_id AS "userId",
      organization_id AS "organizationId",
      use_organization_defaults AS "useOrganizationDefaults",
      email_enabled AS "emailEnabled",
      delivery_mode AS "deliveryMode",
      minimum_priority AS "minimumPriority",
      urgent_delivery AS "urgentDelivery",
      important_delivery AS "importantDelivery",
      general_delivery AS "generalDelivery",
      digest_interval AS "digestInterval",
      TO_CHAR(digest_time, 'HH24:MI') AS "digestTime",
      TO_CHAR(digest_second_time, 'HH24:MI') AS "digestSecondTime"
    FROM user_organization_notification_preference
    WHERE user_id = CAST(${userId} AS UUID)
      AND organization_id = CAST(${organizationId} AS UUID)
    LIMIT 1
  `);

  return mapUserPreferenceRow(
    rows[0] ?? {
      preferenceId: null,
      userId: null,
      organizationId,
      useOrganizationDefaults: null,
      emailEnabled: null,
      deliveryMode: null,
      minimumPriority: null,
      urgentDelivery: null,
      importantDelivery: null,
      generalDelivery: null,
      digestInterval: null,
      digestTime: null,
      digestSecondTime: null,
    },
    defaults
  );
}

export async function getMyOrganizationNotificationCards(
  userId: string,
  executor: SqlExecutor = prisma
): Promise<OrganizationNotificationCardData[]> {
  const rows = await executor.$queryRaw<NotificationCardRow[]>(Prisma.sql`
    SELECT
      o.id AS "organizationId",
      o.name AS "organizationName",
      ons.email_enabled_default AS "emailEnabledDefault",
      ons.delivery_mode_default AS "deliveryModeDefault",
      ons.minimum_priority_default AS "minimumPriorityDefault",
      ons.urgent_delivery_default AS "urgentDeliveryDefault",
      ons.important_delivery_default AS "importantDeliveryDefault",
      ons.general_delivery_default AS "generalDeliveryDefault",
      ons.digest_interval_default AS "digestIntervalDefault",
      TO_CHAR(ons.digest_time_default, 'HH24:MI') AS "digestTimeDefault",
      TO_CHAR(ons.digest_second_time_default, 'HH24:MI') AS "digestSecondTimeDefault",
      uop.id AS "preferenceId",
      uop.user_id AS "userId",
      uop.use_organization_defaults AS "useOrganizationDefaults",
      uop.email_enabled AS "emailEnabled",
      uop.delivery_mode AS "deliveryMode",
      uop.minimum_priority AS "minimumPriority",
      uop.urgent_delivery AS "urgentDelivery",
      uop.important_delivery AS "importantDelivery",
      uop.general_delivery AS "generalDelivery",
      uop.digest_interval AS "digestInterval",
      TO_CHAR(uop.digest_time, 'HH24:MI') AS "digestTime",
      TO_CHAR(uop.digest_second_time, 'HH24:MI') AS "digestSecondTime"
    FROM organization o
    LEFT JOIN organization_notification_settings ons
      ON ons.organization_id = o.id
    LEFT JOIN user_organization_notification_preference uop
      ON uop.organization_id = o.id
     AND uop.user_id = CAST(${userId} AS UUID)
    WHERE EXISTS (
      SELECT 1
      FROM user_organization_role uor
      WHERE uor.org_id = o.id
        AND uor.user_id = CAST(${userId} AS UUID)
    )
    ORDER BY o.name ASC
  `);

  return rows.map((row) => {
    const defaults = mapDefaultsRow(row, row.organizationId);
    const preference = mapUserPreferenceRow(row, defaults);
    const effective = resolveEffectiveNotificationSettings({
      defaults,
      preference,
    });
    const source = getPreferenceSource(preference);

    return {
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      defaults,
      preference,
      effective,
      source,
      summary: buildNotificationPreferenceSummary({
        source,
        effective,
      }),
    };
  });
}

export async function getEffectiveNotificationSettingsForUsers(input: {
  organizationId: string;
  userIds: string[];
  executor?: SqlExecutor;
}): Promise<Map<string, EffectiveNotificationSettings>> {
  const executor = input.executor ?? prisma;
  const uniqueUserIds = Array.from(new Set(input.userIds));

  if (uniqueUserIds.length === 0) {
    return new Map<string, EffectiveNotificationSettings>();
  }

  const defaults = await getOrganizationNotificationDefaults(
    input.organizationId,
    executor
  );

  const userIdFragments = uniqueUserIds.map(
    (userId) => Prisma.sql`CAST(${userId} AS UUID)`
  );
  const rows = await executor.$queryRaw<UserPreferenceBatchRow[]>(Prisma.sql`
    SELECT
      uor.user_id AS "userId",
      pref.use_organization_defaults AS "useOrganizationDefaults",
      pref.email_enabled AS "emailEnabled",
      pref.delivery_mode AS "deliveryMode",
      pref.minimum_priority AS "minimumPriority",
      pref.urgent_delivery AS "urgentDelivery",
      pref.important_delivery AS "importantDelivery",
      pref.general_delivery AS "generalDelivery",
      pref.digest_interval AS "digestInterval",
      TO_CHAR(pref.digest_time, 'HH24:MI') AS "digestTime",
      TO_CHAR(pref.digest_second_time, 'HH24:MI') AS "digestSecondTime"
    FROM user_organization_role uor
    LEFT JOIN user_organization_notification_preference pref
      ON pref.user_id = uor.user_id
     AND pref.organization_id = uor.org_id
    WHERE uor.org_id = CAST(${input.organizationId} AS UUID)
      AND uor.user_id IN (${Prisma.join(userIdFragments)})
  `);

  const settingsByUserId = new Map<string, EffectiveNotificationSettings>();

  for (const row of rows) {
    const deliveryMode =
      row.deliveryMode === null
        ? defaults.deliveryModeDefault
        : coerceDeliveryMode(row.deliveryMode, defaults.deliveryModeDefault);
    const minimumPriority =
      row.minimumPriority === null
        ? defaults.minimumPriorityDefault
        : coerceMinimumPriority(row.minimumPriority, defaults.minimumPriorityDefault);
    const fallbackRules = deriveRulesFromLegacy({
      deliveryMode,
      minimumPriority,
    });

    const preference = {
      userId: row.userId,
      organizationId: input.organizationId,
      useOrganizationDefaults: row.useOrganizationDefaults ?? true,
      emailEnabled: row.emailEnabled,
      deliveryMode: row.deliveryMode === null ? null : deliveryMode,
      minimumPriority: row.minimumPriority === null ? null : minimumPriority,
      urgentDelivery:
        row.urgentDelivery === null
          ? null
          : isUrgentDeliveryMode(row.urgentDelivery)
            ? row.urgentDelivery
            : fallbackRules.urgentDelivery,
      importantDelivery:
        row.importantDelivery === null
          ? null
          : isImportantDeliveryMode(row.importantDelivery)
            ? row.importantDelivery
            : fallbackRules.importantDelivery,
      generalDelivery:
        row.generalDelivery === null
          ? null
          : isGeneralDeliveryMode(row.generalDelivery)
            ? row.generalDelivery
            : fallbackRules.generalDelivery,
      digestInterval:
        row.digestInterval === null
          ? null
          : coerceDigestInterval(
              row.digestInterval,
              defaults.digestIntervalDefault
            ),
      digestTime:
        row.digestTime === null
          ? null
          : coerceDigestTime(row.digestTime, defaults.digestTimeDefault),
      digestSecondTime:
        row.digestSecondTime === null
          ? null
          : coerceDigestTime(
              row.digestSecondTime,
              defaults.digestSecondTimeDefault
            ),
    };

    settingsByUserId.set(
      row.userId,
      resolveEffectiveNotificationSettings({
        defaults,
        preference,
      })
    );
  }

  for (const userId of uniqueUserIds) {
    if (!settingsByUserId.has(userId)) {
      settingsByUserId.set(
        userId,
        resolveEffectiveNotificationSettings({
          defaults,
          preference: null,
        })
      );
    }
  }

  return settingsByUserId;
}

export async function upsertOrganizationNotificationDefaults(
  input: OrganizationNotificationDefaults,
  executor: SqlExecutor = prisma
): Promise<void> {
  await executor.$executeRaw(Prisma.sql`
    INSERT INTO organization_notification_settings (
      organization_id,
      email_enabled_default,
      delivery_mode_default,
      minimum_priority_default,
      urgent_delivery_default,
      important_delivery_default,
      general_delivery_default,
      digest_interval_default,
      digest_time_default,
      digest_second_time_default,
      updated_at
    )
    VALUES (
      CAST(${input.organizationId} AS UUID),
      ${input.emailEnabledDefault},
      ${input.deliveryModeDefault},
      ${input.minimumPriorityDefault},
      ${input.urgentDeliveryDefault},
      ${input.importantDeliveryDefault},
      ${input.generalDeliveryDefault},
      ${input.digestIntervalDefault},
      CAST(${input.digestTimeDefault} AS TIME),
      CAST(${input.digestSecondTimeDefault} AS TIME),
      NOW()
    )
    ON CONFLICT (organization_id)
    DO UPDATE SET
      email_enabled_default = EXCLUDED.email_enabled_default,
      delivery_mode_default = EXCLUDED.delivery_mode_default,
      minimum_priority_default = EXCLUDED.minimum_priority_default,
      urgent_delivery_default = EXCLUDED.urgent_delivery_default,
      important_delivery_default = EXCLUDED.important_delivery_default,
      general_delivery_default = EXCLUDED.general_delivery_default,
      digest_interval_default = EXCLUDED.digest_interval_default,
      digest_time_default = EXCLUDED.digest_time_default,
      digest_second_time_default = EXCLUDED.digest_second_time_default,
      updated_at = NOW()
  `);
}

export async function upsertUserOrganizationNotificationPreference(
  input: UserOrganizationNotificationPreference,
  executor: SqlExecutor = prisma
): Promise<void> {
  await executor.$executeRaw(Prisma.sql`
    INSERT INTO user_organization_notification_preference (
      user_id,
      organization_id,
      use_organization_defaults,
      email_enabled,
      delivery_mode,
      minimum_priority,
      urgent_delivery,
      important_delivery,
      general_delivery,
      digest_interval,
      digest_time,
      digest_second_time,
      updated_at
    )
    VALUES (
      CAST(${input.userId} AS UUID),
      CAST(${input.organizationId} AS UUID),
      ${input.useOrganizationDefaults},
      ${input.emailEnabled},
      ${input.deliveryMode},
      ${input.minimumPriority},
      ${input.urgentDelivery},
      ${input.importantDelivery},
      ${input.generalDelivery},
      ${input.digestInterval},
      CAST(${input.digestTime} AS TIME),
      CAST(${input.digestSecondTime} AS TIME),
      NOW()
    )
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      use_organization_defaults = EXCLUDED.use_organization_defaults,
      email_enabled = EXCLUDED.email_enabled,
      delivery_mode = EXCLUDED.delivery_mode,
      minimum_priority = EXCLUDED.minimum_priority,
      urgent_delivery = EXCLUDED.urgent_delivery,
      important_delivery = EXCLUDED.important_delivery,
      general_delivery = EXCLUDED.general_delivery,
      digest_interval = EXCLUDED.digest_interval,
      digest_time = EXCLUDED.digest_time,
      digest_second_time = EXCLUDED.digest_second_time,
      updated_at = NOW()
  `);
}

export async function syncLegacyMailNotificationForUser(
  input: {
    userId: string;
    organizationId: string;
    emailEnabled: boolean;
  },
  executor: SqlExecutor = prisma
): Promise<void> {
  await executor.$executeRaw(Prisma.sql`
    UPDATE user_organization_role
    SET "hasGetMailNotification" = ${input.emailEnabled}
    WHERE user_id = CAST(${input.userId} AS UUID)
      AND org_id = CAST(${input.organizationId} AS UUID)
  `);
}

export async function syncLegacyMailNotificationForOrgDefaultsUsers(
  input: {
    organizationId: string;
    emailEnabledDefault: boolean;
  },
  executor: SqlExecutor = prisma
): Promise<void> {
  await executor.$executeRaw(Prisma.sql`
    UPDATE user_organization_role uor
    SET "hasGetMailNotification" = ${input.emailEnabledDefault}
    WHERE uor.org_id = CAST(${input.organizationId} AS UUID)
      AND NOT EXISTS (
        SELECT 1
        FROM user_organization_notification_preference pref
        WHERE pref.organization_id = uor.org_id
          AND pref.user_id = uor.user_id
          AND pref.use_organization_defaults = FALSE
      )
  `);
}
