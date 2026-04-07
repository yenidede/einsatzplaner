import { describe, expect, it } from 'vitest';
import { splitWarningRecipientsByDelivery } from './email-warning-routing';

describe('splitWarningRecipientsByDelivery', () => {
  it('ordnet kritische Meldungen in immediate und digest nach Einstellungen ein', () => {
    const result = splitWarningRecipientsByDelivery({
      recipients: [
        {
          userId: 'user-immediate',
          email: 'immediate@example.com',
          name: 'Immediate User',
        },
        {
          userId: 'user-digest',
          email: 'digest@example.com',
          name: 'Digest User',
        },
      ],
      settingsByUserId: new Map([
        [
          'user-immediate',
          {
            emailEnabled: true,
            deliveryMode: 'critical_and_digest',
            minimumPriority: 'review',
            digestInterval: 'daily',
            digestTime: '08:00',
            digestSecondTime: '20:00',
          },
        ],
        [
          'user-digest',
          {
            emailEnabled: true,
            deliveryMode: 'digest_only',
            minimumPriority: 'critical',
            digestInterval: 'every_2_days',
            digestTime: '09:00',
            digestSecondTime: '21:00',
          },
        ],
      ]),
    });

    expect(result.immediateRecipients).toEqual([
      { email: 'immediate@example.com', name: 'Immediate User' },
    ]);
    expect(result.digestRecipients).toEqual([
      {
        userId: 'user-digest',
        email: 'digest@example.com',
        name: 'Digest User',
        digestInterval: 'every_2_days',
        digestTime: '09:00',
        digestSecondTime: '21:00',
      },
    ]);
  });

  it('entfernt Empfaenger bei deaktivierten E-Mails', () => {
    const result = splitWarningRecipientsByDelivery({
      recipients: [
        {
          userId: 'user-disabled',
          email: 'disabled@example.com',
          name: 'Disabled User',
        },
      ],
      settingsByUserId: new Map([
        [
          'user-disabled',
          {
            emailEnabled: false,
            deliveryMode: 'critical_and_digest',
            minimumPriority: 'info',
            digestInterval: 'daily',
            digestTime: '08:00',
            digestSecondTime: '20:00',
          },
        ],
      ]),
    });

    expect(result.immediateRecipients).toEqual([]);
    expect(result.digestRecipients).toEqual([]);
  });
});
