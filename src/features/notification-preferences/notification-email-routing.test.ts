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
        urgentDelivery: 'immediate',
        importantDelivery: 'immediate',
        generalDelivery: 'off',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '16:00',
      },
    });

    expect(delivery).toBe('immediate');
  });

  it('liefert digest für kritische Meldung bei digest_only', () => {
    const delivery = resolveNotificationEmailDelivery({
      eventPriority: 'critical',
      effective: {
        emailEnabled: true,
        deliveryMode: 'digest_only',
        minimumPriority: 'critical',
        urgentDelivery: 'digest',
        importantDelivery: 'immediate',
        generalDelivery: 'off',
        digestInterval: 'every_2_days',
        digestTime: '07:00',
        digestSecondTime: '16:00',
      },
    });

    expect(delivery).toBe('digest');
  });

  it('berechnet nächsten Versand für daily', () => {
    const now = new Date(2026, 3, 7, 19, 0, 0, 0);
    const next = computeNextDigestDispatchAt({
      now,
      digestInterval: 'daily',
      digestTime: '07:00',
      digestSecondTime: '16:00',
    });

    expect(next.getDate()).toBe(now.getDate() + 1);
    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(0);
  });

  it('rollt bei exakt gleicher Versandzeit auf den nächsten Tag', () => {
    const now = new Date(2026, 3, 7, 7, 0, 0, 0);
    const next = computeNextDigestDispatchAt({
      now,
      digestInterval: 'daily',
      digestTime: '07:00',
      digestSecondTime: '16:00',
    });

    expect(next.getDate()).toBe(now.getDate() + 1);
    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(0);
  });

  it('berechnet nächsten Versand für every_2_days', () => {
    const now = new Date(2026, 3, 7, 19, 0, 0, 0);
    const next = computeNextDigestDispatchAt({
      now,
      digestInterval: 'every_2_days',
      digestTime: '07:00',
      digestSecondTime: '16:00',
    });

    expect(next.getDate()).toBe(now.getDate() + 2);
    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(0);
  });

  it('arbeitet konsistent auch bei Date.UTC-basiertem Input', () => {
    const now = new Date(Date.UTC(2026, 3, 7, 18, 30, 0, 0));
    const next = computeNextDigestDispatchAt({
      now,
      digestInterval: 'every_2_days',
      digestTime: '07:00',
      digestSecondTime: '16:00',
    });

    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(0);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });
});
