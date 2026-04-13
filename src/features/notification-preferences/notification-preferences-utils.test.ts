import { describe, expect, it } from 'vitest';
import {
  buildCompactNotificationPreferenceSummary,
  buildNotificationPreferenceSummary,
} from './notification-preferences-utils';

describe('buildCompactNotificationPreferenceSummary', () => {
  it('liefert eine einfache Zusammenfassung für wichtige Meldungen', () => {
    const summary = buildCompactNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'review',
        urgentDelivery: 'immediate',
        importantDelivery: 'immediate',
        generalDelivery: 'off',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '20:00',
      },
    });

    expect(summary).toBe('Eigene Einstellung: Nur wichtige Meldungen');
  });

  it('kennzeichnet deaktivierte E-Mails klar', () => {
    const summary = buildCompactNotificationPreferenceSummary({
      source: 'organization',
      effective: {
        emailEnabled: false,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'review',
        urgentDelivery: 'immediate',
        importantDelivery: 'immediate',
        generalDelivery: 'off',
        digestInterval: 'every_2_days',
        digestTime: '08:00',
        digestSecondTime: '20:00',
      },
    });

    expect(summary).toBe('Organisationsstandard: Keine E-Mails');
  });

  it('zeigt Digest-Preset mit Zeitplan', () => {
    const compactSummary = buildCompactNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'info',
        urgentDelivery: 'immediate',
        importantDelivery: 'digest',
        generalDelivery: 'digest',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '16:00',
      },
    });

    const fullSummary = buildNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'info',
        urgentDelivery: 'immediate',
        importantDelivery: 'digest',
        generalDelivery: 'digest',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '16:00',
      },
    });

    expect(compactSummary).toBe('Eigene Einstellung: Sammelmail täglich um 08:00');
    expect(fullSummary).toContain('Eigene Einstellung wird verwendet.');
  });

  it('zeigt bei nicht-Preset-Regeln „Individuell angepasst“', () => {
    const summary = buildCompactNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'review',
        urgentDelivery: 'digest',
        importantDelivery: 'digest',
        generalDelivery: 'off',
        digestInterval: 'every_2_days',
        digestTime: '08:00',
        digestSecondTime: '16:00',
      },
    });

    expect(summary).toBe('Eigene Einstellung: Individuell angepasst');
  });
});

