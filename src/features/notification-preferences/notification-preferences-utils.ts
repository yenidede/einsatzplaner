import {
  DIGEST_INTERVAL_LABELS,
  MINIMUM_PRIORITY_SUMMARY_LABELS,
} from './constants';
import type {
  DeliveryMode,
  DigestInterval,
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
  return value === 'daily' || value === 'twice_daily';
}

export function deliveryModeUsesDigest(
  deliveryMode: EffectiveNotificationSettings['deliveryMode']
): boolean {
  return (
    deliveryMode === 'digest_only' || deliveryMode === 'critical_and_digest'
  );
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
    };
  }

  return {
    emailEnabled: preference.emailEnabled ?? defaults.emailEnabledDefault,
    deliveryMode: preference.deliveryMode ?? defaults.deliveryModeDefault,
    minimumPriority:
      preference.minimumPriority ?? defaults.minimumPriorityDefault,
    digestInterval: preference.digestInterval ?? defaults.digestIntervalDefault,
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

function buildDeliverySummary(effective: EffectiveNotificationSettings): string {
  if (effective.deliveryMode === 'critical_only') {
    return 'Dringende Meldungen werden sofort per E-Mail gesendet.';
  }

  if (effective.deliveryMode === 'digest_only') {
    return `E-Mails werden als Sammelmail versendet (${DIGEST_INTERVAL_LABELS[effective.digestInterval]}).`;
  }

  return `Dringende Meldungen kommen sofort, sonst ${DIGEST_INTERVAL_LABELS[effective.digestInterval]} als Sammelmail.`;
}

function buildPrioritySummary(effective: EffectiveNotificationSettings): string {
  if (effective.deliveryMode === 'critical_only') {
    return 'Sie erhalten E-Mails nur zu dringenden Meldungen.';
  }

  return `Sie erhalten E-Mails zu ${MINIMUM_PRIORITY_SUMMARY_LABELS[effective.minimumPriority]}.`;
}

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
