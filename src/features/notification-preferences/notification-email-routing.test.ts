import { describe, expect, it } from 'vitest';
import {
  computeNextDigestDispatchAt,
  isNotificationPriorityAllowed,
  resolveNotificationEmailDelivery,
} from './notification-email-routing';

describe('notification-email-routing', () => {
  it('lässt nur passende Prioritäten zu', () => {
    expect(isNotificationPriorityAllowed('info', 'review')).toBe(true);
    expect(isNotificationPriorityAllowed('review', 'critical')).toBe(true);
    expect(isNotificationPriorityAllowed('critical', 'review')).toBe(false);
  });

  it('liefert immediate für kritische Meldung bei critical_and_digest', () => {
    const delivery = resolveNotificationEmailDelivery({
      eventPriority: 'critical',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'review',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '20:00',
      },
    });

    expect(delivery).toBe('immediate');
  });

  it('liefert digest für review Meldung bei critical_and_digest', () => {
    const delivery = resolveNotificationEmailDelivery({
      eventPriority: 'review',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'review',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '20:00',
      },
    });

    expect(delivery).toBe('digest');
  });

  it('liefert digest für kritische Meldung bei digest_only', () => {
    const delivery = resolveNotificationEmailDelivery({
      eventPriority: 'critical',
      effective: {
        emailEnabled: true,
        deliveryMode: 'digest_only',
        minimumPriority: 'critical',
        digestInterval: 'twice_daily',
        digestTime: '07:00',
        digestSecondTime: '19:00',
      },
    });

    expect(delivery).toBe('digest');
  });

  it('berechnet nächsten Tagesversand für daily mit konfigurierter Uhrzeit', () => {
    const now = new Date(2026, 3, 7, 8, 15, 0, 0);
    const next = computeNextDigestDispatchAt({
      now,
      digestInterval: 'daily',
      digestTime: '17:30',
      digestSecondTime: '20:00',
    });

    expect(next.getDate()).toBe(now.getDate());
    expect(next.getHours()).toBe(17);
    expect(next.getMinutes()).toBe(30);
  });

  it('berechnet nächsten Versand für twice_daily mit zwei Zeiten', () => {
    const now = new Date(2026, 3, 7, 19, 0, 0, 0);
    const next = computeNextDigestDispatchAt({
      now,
      digestInterval: 'twice_daily',
      digestTime: '07:00',
      digestSecondTime: '20:00',
    });

    expect(next.getDate()).toBe(now.getDate());
    expect(next.getHours()).toBe(20);
    expect(next.getMinutes()).toBe(0);
  });
});
