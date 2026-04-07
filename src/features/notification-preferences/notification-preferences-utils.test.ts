import { describe, expect, it } from 'vitest';
import {
  buildCompactNotificationPreferenceSummary,
  buildNotificationPreferenceSummary,
} from './notification-preferences-utils';

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

  it('zeigt bei critical_and_digest + critical keine Sammelmail in der Zusammenfassung', () => {
    const compactSummary = buildCompactNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'critical',
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
        minimumPriority: 'critical',
        digestInterval: 'daily',
        digestTime: '08:00',
        digestSecondTime: '16:00',
      },
    });

    expect(compactSummary).toBe('Eigene Einstellung: Dringende Meldungen sofort');
    expect(fullSummary).toBe(
      'Eigene Einstellung wird verwendet. Dringende Meldungen kommen sofort per E-Mail. Sie erhalten E-Mails nur zu dringenden Meldungen.'
    );
  });

  it('zeigt bei digest_only + critical weiterhin Sammelmail an', () => {
    const summary = buildCompactNotificationPreferenceSummary({
      source: 'user',
      effective: {
        emailEnabled: true,
        deliveryMode: 'digest_only',
        minimumPriority: 'critical',
        digestInterval: 'every_2_days',
        digestTime: '08:00',
        digestSecondTime: '16:00',
      },
    });

    expect(summary).toBe(
      'Eigene Einstellung: dringende Meldungen alle 2 Tage um 08:00 als Sammelmail'
    );
  });
});

