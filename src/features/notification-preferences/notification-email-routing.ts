import { NOTIFICATION_DEFAULTS } from './constants';
import { isDigestTime } from './notification-preferences-utils';
import type {
  DigestInterval,
  DigestTime,
  EffectiveNotificationSettings,
  MinimumPriority,
} from './types';

export type NotificationEmailDelivery = 'none' | 'immediate' | 'digest';

const PRIORITY_ORDER: Record<MinimumPriority, number> = {
  info: 0,
  review: 1,
  critical: 2,
};

export function isNotificationPriorityAllowed(
  minimumPriority: MinimumPriority,
  eventPriority: MinimumPriority
): boolean {
  return PRIORITY_ORDER[eventPriority] >= PRIORITY_ORDER[minimumPriority];
}

export function resolveNotificationEmailDelivery(input: {
  effective: EffectiveNotificationSettings;
  eventPriority: MinimumPriority;
}): NotificationEmailDelivery {
  const { effective, eventPriority } = input;

  if (!effective.emailEnabled) {
    return 'none';
  }

  const deliveryByPriority: Record<MinimumPriority, NotificationEmailDelivery> = {
    critical: effective.urgentDelivery === 'immediate' ? 'immediate' : 'digest',
    review: effective.importantDelivery === 'immediate' ? 'immediate' : 'digest',
    info: effective.generalDelivery === 'digest' ? 'digest' : 'none',
  };

  return deliveryByPriority[eventPriority];
}

function buildTodayAt(time: DigestTime, now: Date): Date {
  const [hourString, minuteString] = time.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);

  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function normalizeDigestTime(
  value: DigestTime | undefined,
  fallback: DigestTime
): DigestTime {
  if (value && isDigestTime(value)) {
    return value;
  }
  return fallback;
}

function getDigestIntervalInDays(digestInterval: DigestInterval): number {
  switch (digestInterval) {
    case 'daily':
      return 1;
    case 'every_2_days':
      return 2;
    case 'every_3_days':
      return 3;
    case 'every_5_days':
      return 5;
    case 'every_7_days':
      return 7;
  }
}

export function computeNextDigestDispatchAt(input: {
  now: Date;
  digestInterval: DigestInterval;
  digestTime: DigestTime;
  digestSecondTime?: DigestTime;
}): Date {
  const { now, digestInterval } = input;
  const firstDigestTime = normalizeDigestTime(
    input.digestTime,
    NOTIFICATION_DEFAULTS.digestTimeDefault
  );

  const todayAtDigestTime = buildTodayAt(firstDigestTime, now);
  if (todayAtDigestTime.getTime() > now.getTime()) {
    return todayAtDigestTime;
  }

  const nextDispatch = new Date(todayAtDigestTime);
  nextDispatch.setDate(
    nextDispatch.getDate() + getDigestIntervalInDays(digestInterval)
  );
  return nextDispatch;
}
