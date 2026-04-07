import { isNormalizedTime } from '@/lib/time-input';
import {
  MINIMUM_PRIORITY_SUMMARY_LABELS,
  NOTIFICATION_DEFAULTS,
} from './constants';
import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  EffectiveNotificationSettings,
  MinimumPriority,
  NotificationPreferenceContext,
} from './types';

export function isDeliveryMode(value: string): value is DeliveryMode {
  return (
    value === 'critical_only' ||
    value === 'digest_only' ||
    value === 'critical_and_digest'
  );
}

export function isMinimumPriority(value: string): value is MinimumPriority {
  return value === 'info' || value === 'review' || value === 'critical';
}

export function isDigestInterval(value: string): value is DigestInterval {
  return value === 'daily' || value === 'every_2_days';
}

export function isDigestTime(value: string): value is DigestTime {
  return isNormalizedTime(value);
}

export function deliveryModeUsesDigest(
  deliveryMode: EffectiveNotificationSettings['deliveryMode']
): boolean {
  return (
    deliveryMode === 'digest_only' || deliveryMode === 'critical_and_digest'
  );
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

export function resolveEffectiveNotificationSettings({
  defaults,
  preference,
}: NotificationPreferenceContext): EffectiveNotificationSettings {
  const usesOrganizationDefaults =
    !preference || preference.useOrganizationDefaults === true;

  if (usesOrganizationDefaults) {
    return {
      emailEnabled: defaults.emailEnabledDefault,
      deliveryMode: defaults.deliveryModeDefault,
      minimumPriority: defaults.minimumPriorityDefault,
      digestInterval: defaults.digestIntervalDefault,
      digestTime: coerceDigestTime(
        defaults.digestTimeDefault,
        NOTIFICATION_DEFAULTS.digestTimeDefault
      ),
      digestSecondTime: coerceDigestTime(
        defaults.digestSecondTimeDefault,
        NOTIFICATION_DEFAULTS.digestSecondTimeDefault
      ),
    };
  }

  return {
    emailEnabled: preference.emailEnabled ?? defaults.emailEnabledDefault,
    deliveryMode: preference.deliveryMode ?? defaults.deliveryModeDefault,
    minimumPriority:
      preference.minimumPriority ?? defaults.minimumPriorityDefault,
    digestInterval: preference.digestInterval ?? defaults.digestIntervalDefault,
    digestTime: coerceDigestTime(
      preference.digestTime ?? defaults.digestTimeDefault,
      NOTIFICATION_DEFAULTS.digestTimeDefault
    ),
    digestSecondTime: coerceDigestTime(
      preference.digestSecondTime ?? defaults.digestSecondTimeDefault,
      NOTIFICATION_DEFAULTS.digestSecondTimeDefault
    ),
  };
}

export function getPreferenceSource(preference: {
  useOrganizationDefaults: boolean;
} | null): 'organization' | 'user' {
  if (!preference || preference.useOrganizationDefaults) {
    return 'organization';
  }

  return 'user';
}

export function buildDigestScheduleLabel(input: {
  digestInterval: DigestInterval;
  digestTime: DigestTime;
  digestSecondTime: DigestTime;
  short?: boolean;
}): string {
  const { digestInterval, digestTime, short = false } = input;

  if (digestInterval === 'daily') {
    return short ? `täglich um ${digestTime}` : `1x täglich um ${digestTime}`;
  }

  if (digestInterval === 'every_2_days') {
    return short
      ? `alle 2 Tage um ${digestTime}`
      : `alle 2 Tage um ${digestTime}`;
  }
  return short ? `täglich um ${digestTime}` : `1x täglich um ${digestTime}`;
}

function buildDeliverySummary(effective: EffectiveNotificationSettings): string {
  if (effective.deliveryMode === 'critical_only') {
    return 'Dringende Meldungen werden sofort per E-Mail gesendet.';
  }

  const hasDigest =
    effective.deliveryMode === 'digest_only' ||
    (effective.deliveryMode === 'critical_and_digest' &&
      effective.minimumPriority !== 'critical');

  if (!hasDigest) {
    return 'Dringende Meldungen kommen sofort per E-Mail.';
  }

  const scheduleLabel = buildDigestScheduleLabel({
    digestInterval: effective.digestInterval,
    digestTime: effective.digestTime,
    digestSecondTime: effective.digestSecondTime,
  });

  if (effective.deliveryMode === 'digest_only') {
    return `E-Mails werden als Sammelmail versendet (${scheduleLabel}).`;
  }

  return `Dringende Meldungen kommen sofort, sonst ${scheduleLabel} als Sammelmail.`;
}

function buildPrioritySummary(effective: EffectiveNotificationSettings): string {
  if (
    effective.deliveryMode === 'critical_only' ||
    (effective.deliveryMode === 'critical_and_digest' &&
      effective.minimumPriority === 'critical')
  ) {
    return 'Sie erhalten E-Mails nur zu dringenden Meldungen.';
  }

  return `Sie erhalten E-Mails zu ${MINIMUM_PRIORITY_SUMMARY_LABELS[effective.minimumPriority]}.`;
}

const COMPACT_SOURCE_LABELS: Record<'organization' | 'user', string> = {
  organization: 'Organisationsstandard',
  user: 'Eigene Einstellung',
};

const COMPACT_PRIORITY_LABELS: Record<MinimumPriority, string> = {
  info: 'alle Meldungen',
  review: 'wichtige Meldungen',
  critical: 'dringende Meldungen',
};

const COMPACT_DIGEST_INTERVAL_LABELS: Record<DigestInterval, string> = {
  daily: 'täglich',
  every_2_days: 'alle 2 Tage',
};

export function buildNotificationPreferenceSummary(input: {
  source: 'organization' | 'user';
  effective: EffectiveNotificationSettings;
}): string {
  const { source, effective } = input;

  const sourceSummary =
    source === 'organization'
      ? 'Standardeinstellung der Organisation wird verwendet.'
      : 'Eigene Einstellung wird verwendet.';

  if (!effective.emailEnabled) {
    return `${sourceSummary} Für diese Organisation sind E-Mail-Benachrichtigungen deaktiviert.`;
  }

  return `${sourceSummary} ${buildDeliverySummary(effective)} ${buildPrioritySummary(effective)}`;
}

export function buildCompactNotificationPreferenceSummary(input: {
  source: 'organization' | 'user';
  effective: EffectiveNotificationSettings;
}): string {
  const { source, effective } = input;
  const sourceLabel = COMPACT_SOURCE_LABELS[source];

  if (!effective.emailEnabled) {
    return `${sourceLabel}: E-Mails deaktiviert`;
  }

  if (effective.deliveryMode === 'critical_only') {
    return `${sourceLabel}: Dringende Meldungen sofort`;
  }

  const hasDigest =
    effective.deliveryMode === 'digest_only' ||
    (effective.deliveryMode === 'critical_and_digest' &&
      effective.minimumPriority !== 'critical');

  if (!hasDigest) {
    return `${sourceLabel}: Dringende Meldungen sofort`;
  }

  const digestIntervalLabel =
    COMPACT_DIGEST_INTERVAL_LABELS[effective.digestInterval];
  const priorityLabel = COMPACT_PRIORITY_LABELS[effective.minimumPriority];
  const scheduleLabel = `${digestIntervalLabel} um ${effective.digestTime}`;

  if (effective.deliveryMode === 'digest_only') {
    return `${sourceLabel}: ${priorityLabel} ${scheduleLabel} als Sammelmail`;
  }

  return `${sourceLabel}: Dringend sofort, ${priorityLabel} ${scheduleLabel} als Sammelmail`;
}
