import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
} from './types';

export const DELIVERY_MODE_VALUES = [
  'critical_only',
  'digest_only',
  'critical_and_digest',
] as const satisfies readonly DeliveryMode[];

export const MINIMUM_PRIORITY_VALUES = [
  'info',
  'review',
  'critical',
] as const satisfies readonly MinimumPriority[];

export const DIGEST_INTERVAL_VALUES = [
  'daily',
  'every_2_days',
  'every_3_days',
  'every_5_days',
  'every_7_days',
] as const satisfies readonly DigestInterval[];

function createDigestTimeValues(stepMinutes: number): DigestTime[] {
  const values: DigestTime[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      values.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      );
    }
  }
  return values;
}

export const DIGEST_TIME_VALUES = createDigestTimeValues(30);

export const NOTIFICATION_DEFAULTS = {
  emailEnabledDefault: true,
  deliveryModeDefault: 'critical_and_digest',
  minimumPriorityDefault: 'review',
  digestIntervalDefault: 'daily',
  digestTimeDefault: '08:00',
  digestSecondTimeDefault: '16:00',
} as const;

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  critical_only: 'Nur dringende Meldungen sofort',
  digest_only: 'Nur als Sammelmail',
  critical_and_digest: 'Dringende Meldungen sofort, sonst als Sammelmail',
};

export const MINIMUM_PRIORITY_LABELS: Record<MinimumPriority, string> = {
  info: 'Auch über allgemeine Informationen',
  review: 'Über wichtige Meldungen',
  critical: 'Nur über dringende Meldungen',
};

export const DIGEST_INTERVAL_LABELS: Record<DigestInterval, string> = {
  daily: 'täglich',
  every_2_days: 'alle 2 Tage',
  every_3_days: 'alle 3 Tage',
  every_5_days: 'alle 5 Tage',
  every_7_days: 'alle 7 Tage',
};

export const MINIMUM_PRIORITY_SUMMARY_LABELS: Record<MinimumPriority, string> =
{
  info: 'allgemeine Informationen, wichtige und dringende Meldungen',
  review: 'wichtige und dringende Meldungen',
  critical: 'dringende Meldungen',
};

export const MINIMUM_PRIORITY_EXPLANATIONS: Record<
  MinimumPriority,
  {
    title: string;
    description: string;
    example: string;
  }
> = {
  info: {
    title: 'Allgemeine Informationen',
    description:
      'Reine Informationsmeldungen ohne unmittelbaren Handlungsbedarf.',
    example: 'Beispiel: Eine Einladung wurde angenommen.',
  },
  review: {
    title: 'Wichtige Meldungen',
    description: 'Meldungen, die geprüft oder zeitnah beachtet werden sollten.',
    example: 'Beispiel: Eine Angabe sollte geprüft werden.',
  },
  critical: {
    title: 'Dringende Meldungen',
    description:
      'Akute Meldungen, bei denen schnelles Handeln sinnvoll oder nötig ist.',
    example: 'Beispiel: Ein akutes Problem kurz vor einem Termin.',
  },
};
