import { describe, expect, it } from 'vitest';
import { buildCompactNotificationPreferenceSummary } from './notification-preferences-utils';

describe('buildCompactNotificationPreferenceSummary', () => {
  it('liefert eine kompakte Zusammenfassung für eigene Einstellungen mit Sofort+Sammelmail', () => {
    const summary = buildCompactNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'review',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '20:00',
      },
    });

    expect(summary).toBe(
      'Eigene Einstellung: Dringend sofort, wichtige Meldungen täglich um 08:00 als Sammelmail'
    );
  });

  it('kennzeichnet deaktivierte E-Mails klar', () => {
    const summary = buildCompactNotificationPreferenceSummary({
      source: 'organization',
      effective: {
        emailEnabled: false,
        deliveryMode: 'digest_only',
        minimumPriority: 'info',
        digestInterval: 'every_2_days',
        digestTime: '08:00',
        digestSecondTime: '20:00',
      },
    });

    expect(summary).toBe('Organisationsstandard: E-Mails deaktiviert');
  });
});

