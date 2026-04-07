import { Prisma } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import {
  NOTIFICATION_DEFAULTS,
} from './constants';
import {
  buildNotificationPreferenceSummary,
  getPreferenceSource,
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
  return {
    organizationId,
    emailEnabledDefault:
      row?.emailEnabledDefault ?? NOTIFICATION_DEFAULTS.emailEnabledDefault,
    deliveryModeDefault: coerceDeliveryMode(
      row?.deliveryModeDefault,
      NOTIFICATION_DEFAULTS.deliveryModeDefault
    ),
    minimumPriorityDefault: coerceMinimumPriority(
      row?.minimumPriorityDefault,
      NOTIFICATION_DEFAULTS.minimumPriorityDefault
    ),
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
  row: UserPreferenceRow
): UserOrganizationNotificationPreference | null {
  if (!row.preferenceId || !row.userId) {
    return null;
  }

  return {
    userId: row.userId,
    organizationId: row.organizationId,
    useOrganizationDefaults: row.useOrganizationDefaults ?? true,
    emailEnabled: row.emailEnabled,
    deliveryMode:
      row.deliveryMode === null
        ? null
        : coerceDeliveryMode(row.deliveryMode, 'critical_and_digest'),
    minimumPriority:
      row.minimumPriority === null
        ? null
        : coerceMinimumPriority(row.minimumPriority, 'review'),
    digestInterval:
      row.digestInterval === null
        ? null
        : coerceDigestInterval(row.digestInterval, NOTIFICATION_DEFAULTS.digestIntervalDefault),
    digestTime:
      row.digestTime === null
        ? null
        : coerceDigestTime(row.digestTime, NOTIFICATION_DEFAULTS.digestTimeDefault),
    digestSecondTime:
      row.digestSecondTime === null
        ? null
        : coerceDigestTime(
            row.digestSecondTime,
            NOTIFICATION_DEFAULTS.digestSecondTimeDefault
          ),
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
  executor: SqlExecutor = prisma
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
      digestInterval: null,
      digestTime: null,
      digestSecondTime: null,
    }
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
      ons.digest_interval_default AS "digestIntervalDefault",
      TO_CHAR(ons.digest_time_default, 'HH24:MI') AS "digestTimeDefault",
      TO_CHAR(ons.digest_second_time_default, 'HH24:MI') AS "digestSecondTimeDefault",
      uop.id AS "preferenceId",
      uop.user_id AS "userId",
      uop.use_organization_defaults AS "useOrganizationDefaults",
      uop.email_enabled AS "emailEnabled",
      uop.delivery_mode AS "deliveryMode",
      uop.minimum_priority AS "minimumPriority",
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
    const preference = mapUserPreferenceRow(row);
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
    const preference = {
      userId: row.userId,
      organizationId: input.organizationId,
      useOrganizationDefaults: row.useOrganizationDefaults ?? true,
      emailEnabled: row.emailEnabled,
      deliveryMode:
        row.deliveryMode === null
          ? null
          : coerceDeliveryMode(row.deliveryMode, defaults.deliveryModeDefault),
      minimumPriority:
        row.minimumPriority === null
          ? null
          : coerceMinimumPriority(
              row.minimumPriority,
              defaults.minimumPriorityDefault
            ),
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
