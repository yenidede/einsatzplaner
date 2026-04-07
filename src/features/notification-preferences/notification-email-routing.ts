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

  if (!isNotificationPriorityAllowed(effective.minimumPriority, eventPriority)) {
    return 'none';
  }

  if (effective.deliveryMode === 'critical_only') {
    return eventPriority === 'critical' ? 'immediate' : 'none';
  }

  if (effective.deliveryMode === 'digest_only') {
    return 'digest';
  }

  return eventPriority === 'critical' ? 'immediate' : 'digest';
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

  if (digestInterval === 'daily') {
    const todayAtDigestTime = buildTodayAt(firstDigestTime, now);
    if (todayAtDigestTime.getTime() > now.getTime()) {
      return todayAtDigestTime;
    }

    const tomorrowAtDigestTime = new Date(todayAtDigestTime);
    tomorrowAtDigestTime.setDate(tomorrowAtDigestTime.getDate() + 1);
    return tomorrowAtDigestTime;
  }

  const secondDigestTime = normalizeDigestTime(
    input.digestSecondTime,
    NOTIFICATION_DEFAULTS.digestSecondTimeDefault
  );

  const todayCandidates = [
    buildTodayAt(firstDigestTime, now),
    buildTodayAt(secondDigestTime, now),
  ].sort((left, right) => left.getTime() - right.getTime());

  const nextTodayCandidate = todayCandidates.find(
    (candidate) => candidate.getTime() > now.getTime()
  );
  if (nextTodayCandidate) {
    return nextTodayCandidate;
  }

  const tomorrowFirstCandidate = new Date(todayCandidates[0]);
  tomorrowFirstCandidate.setDate(tomorrowFirstCandidate.getDate() + 1);
  return tomorrowFirstCandidate;
}
