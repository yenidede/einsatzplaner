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
  PriorityDeliveryMode,
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

export function isUrgentDeliveryMode(
  value: string
): value is Exclude<PriorityDeliveryMode, 'off'> {
  return value === 'immediate' || value === 'digest';
}

export function isImportantDeliveryMode(
  value: string
): value is Exclude<PriorityDeliveryMode, 'off'> {
  return value === 'immediate' || value === 'digest';
}

export function isGeneralDeliveryMode(
  value: string
): value is Exclude<PriorityDeliveryMode, 'immediate'> {
  return value === 'digest' || value === 'off';
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

export function deriveRulesFromLegacy(input: {
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
}): {
  urgentDelivery: Exclude<PriorityDeliveryMode, 'off'>;
  importantDelivery: Exclude<PriorityDeliveryMode, 'off'>;
  generalDelivery: Exclude<PriorityDeliveryMode, 'immediate'>;
} {
  const { deliveryMode, minimumPriority } = input;

  const urgentDelivery: Exclude<PriorityDeliveryMode, 'off'> =
    deliveryMode === 'digest_only' ? 'digest' : 'immediate';

  // Intentional exception: "wichtig" bleibt für legacy digest_only auf immediate,
  // damit wichtige/akute Hinweise weiterhin ohne Verzögerung zugestellt werden.
  // Das kontrastiert zu urgent/general, die im digest_only-Pfad gebündelt werden.
  const importantDelivery: Exclude<PriorityDeliveryMode, 'off'> =
    deliveryMode === 'critical_and_digest' && minimumPriority !== 'critical'
      ? 'digest'
      : 'immediate';

  const generalDelivery: Exclude<PriorityDeliveryMode, 'immediate'> =
    minimumPriority === 'info' &&
    (deliveryMode === 'critical_and_digest' || deliveryMode === 'digest_only')
      ? 'digest'
      : 'off';

  return { urgentDelivery, importantDelivery, generalDelivery };
}

export function deriveLegacyFromRules(input: {
  urgentDelivery: Exclude<PriorityDeliveryMode, 'off'>;
  importantDelivery: Exclude<PriorityDeliveryMode, 'off'>;
  generalDelivery: Exclude<PriorityDeliveryMode, 'immediate'>;
}): {
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
} {
  const { urgentDelivery, importantDelivery, generalDelivery } = input;

  const deliveryMode: DeliveryMode =
    urgentDelivery === 'digest' ? 'digest_only' : 'critical_and_digest';

  const minimumPriority: MinimumPriority =
    generalDelivery === 'digest'
      ? 'info'
      : importantDelivery === 'digest'
        ? 'review'
        : 'critical';

  return { deliveryMode, minimumPriority };
}

export function resolveEffectiveNotificationSettings({
  defaults,
  preference,
}: NotificationPreferenceContext): EffectiveNotificationSettings {
  const usesOrganizationDefaults =
    !preference || preference.useOrganizationDefaults === true;

  const base = usesOrganizationDefaults
    ? {
        emailEnabled: defaults.emailEnabledDefault,
        deliveryMode: defaults.deliveryModeDefault,
        minimumPriority: defaults.minimumPriorityDefault,
        urgentDelivery: defaults.urgentDeliveryDefault,
        importantDelivery: defaults.importantDeliveryDefault,
        generalDelivery: defaults.generalDeliveryDefault,
        digestInterval: defaults.digestIntervalDefault,
        digestTime: defaults.digestTimeDefault,
        digestSecondTime: defaults.digestSecondTimeDefault,
      }
    : {
        emailEnabled: preference.emailEnabled ?? defaults.emailEnabledDefault,
        deliveryMode: preference.deliveryMode ?? defaults.deliveryModeDefault,
        minimumPriority:
          preference.minimumPriority ?? defaults.minimumPriorityDefault,
        urgentDelivery:
          preference.urgentDelivery ?? defaults.urgentDeliveryDefault,
        importantDelivery:
          preference.importantDelivery ?? defaults.importantDeliveryDefault,
        generalDelivery:
          preference.generalDelivery ?? defaults.generalDeliveryDefault,
        digestInterval: preference.digestInterval ?? defaults.digestIntervalDefault,
        digestTime: preference.digestTime ?? defaults.digestTimeDefault,
        digestSecondTime:
          preference.digestSecondTime ?? defaults.digestSecondTimeDefault,
      };

  const legacyFallbackRules = deriveRulesFromLegacy({
    deliveryMode: base.deliveryMode,
    minimumPriority: base.minimumPriority,
  });

  const urgentDelivery = base.urgentDelivery ?? legacyFallbackRules.urgentDelivery;
  const importantDelivery =
    base.importantDelivery ?? legacyFallbackRules.importantDelivery;
  const generalDelivery = base.generalDelivery ?? legacyFallbackRules.generalDelivery;

  const normalizedLegacy = deriveLegacyFromRules({
    urgentDelivery,
    importantDelivery,
    generalDelivery,
  });

  return {
    emailEnabled: base.emailEnabled,
    deliveryMode: normalizedLegacy.deliveryMode,
    minimumPriority: normalizedLegacy.minimumPriority,
    urgentDelivery,
    importantDelivery,
    generalDelivery,
    digestInterval: base.digestInterval,
    digestTime: coerceDigestTime(
      base.digestTime,
      NOTIFICATION_DEFAULTS.digestTimeDefault
    ),
    digestSecondTime: coerceDigestTime(
      base.digestSecondTime,
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
  short?: boolean;
}): string {
  const { digestInterval, digestTime, short = false } = input;

  if (digestInterval === 'daily') {
    return short ? `täglich um ${digestTime}` : `Täglich um ${digestTime}`;
  }

  if (digestInterval === 'every_2_days') {
    return `alle 2 Tage um ${digestTime}`;
  }

  return short ? `täglich um ${digestTime}` : `Täglich um ${digestTime}`;
}

function buildDeliverySummary(effective: EffectiveNotificationSettings): string {
  const hasDigest =
    effective.urgentDelivery === 'digest' ||
    effective.importantDelivery === 'digest' ||
    effective.generalDelivery === 'digest';

  if (!hasDigest) {
    return 'Meldungen werden sofort per E-Mail gesendet.';
  }

  const scheduleLabel = buildDigestScheduleLabel({
    digestInterval: effective.digestInterval,
    digestTime: effective.digestTime,
  });

  if (
    effective.urgentDelivery === 'immediate' &&
    effective.importantDelivery === 'digest' &&
    effective.generalDelivery === 'digest'
  ) {
    return `E-Mails werden als Sammelmail versendet (${scheduleLabel}).`;
  }

  return `Sammelmails werden ${scheduleLabel} versendet.`;
}

function buildPrioritySummary(effective: EffectiveNotificationSettings): string {
  if (
    effective.importantDelivery === 'immediate' &&
    effective.generalDelivery === 'off'
  ) {
    return 'Sie erhalten E-Mails zu dringenden und wichtigen Meldungen.';
  }

  if (
    effective.importantDelivery === 'digest' &&
    effective.generalDelivery === 'off'
  ) {
    return `Sie erhalten E-Mails zu ${MINIMUM_PRIORITY_SUMMARY_LABELS.review}.`;
  }

  return `Sie erhalten E-Mails zu ${MINIMUM_PRIORITY_SUMMARY_LABELS.info}.`;
}

const COMPACT_SOURCE_LABELS: Record<'organization' | 'user', string> = {
  organization: 'Organisationsstandard',
  user: 'Eigene Einstellung',
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
    return `${sourceLabel}: Keine E-Mails`;
  }

  const digestIntervalLabel =
    COMPACT_DIGEST_INTERVAL_LABELS[effective.digestInterval];
  const scheduleLabel = `Sammelmail ${digestIntervalLabel} um ${effective.digestTime}`;

  if (
    effective.urgentDelivery === 'immediate' &&
    effective.importantDelivery === 'immediate' &&
    effective.generalDelivery === 'off'
  ) {
    return `${sourceLabel}: Nur wichtige Meldungen`;
  }

  if (
    effective.urgentDelivery === 'immediate' &&
    effective.importantDelivery === 'digest' &&
    effective.generalDelivery === 'digest'
  ) {
    return `${sourceLabel}: ${scheduleLabel}`;
  }

  return `${sourceLabel}: Individuell angepasst`;
}
