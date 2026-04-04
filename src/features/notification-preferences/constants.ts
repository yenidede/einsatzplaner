import type {
  DeliveryMode,
  DigestInterval,
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
  'twice_daily',
] as const satisfies readonly DigestInterval[];

export const NOTIFICATION_DEFAULTS = {
  emailEnabledDefault: true,
  deliveryModeDefault: 'critical_and_digest',
  minimumPriorityDefault: 'review',
  digestIntervalDefault: 'daily',
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
  daily: '1x täglich',
  twice_daily: '2x täglich',
};

export const MINIMUM_PRIORITY_SUMMARY_LABELS: Record<MinimumPriority, string> = {
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
    description:
      'Meldungen, die geprüft oder zeitnah beachtet werden sollten.',
    example: 'Beispiel: Eine Angabe sollte geprüft werden.',
  },
  critical: {
    title: 'Dringende Meldungen',
    description:
      'Akute Meldungen, bei denen schnelles Handeln sinnvoll oder nötig ist.',
    example: 'Beispiel: Ein akutes Problem kurz vor einem Termin.',
  },
};
