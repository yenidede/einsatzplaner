import { describe, expect, it, vi } from 'vitest';

const { mockGetEffectiveNotificationSettingsForUsers } = vi.hoisted(() => ({
  mockGetEffectiveNotificationSettingsForUsers: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {},
}));

vi.mock('@/lib/email/EmailService', () => ({
  emailService: {},
}));

vi.mock('@/features/activity_log/changeTypeIds', () => ({
  ChangeTypeIds: {
    'E-Bearbeitet': 'change-type-edit',
  },
}));

vi.mock('@/features/notification-preferences/notification-preferences-dal', () => ({
  getEffectiveNotificationSettingsForUsers:
    mockGetEffectiveNotificationSettingsForUsers,
}));

import { routeEinsatzWarningRecipientsByPreference } from './email-helpers';

describe('routeEinsatzWarningRecipientsByPreference', () => {
  it('ordnet Empfaenger anhand der effektiven Einstellungen korrekt zu', async () => {
    mockGetEffectiveNotificationSettingsForUsers.mockResolvedValue(
      new Map([
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
            digestTime: '10:00',
            digestSecondTime: '22:00',
          },
        ],
      ])
    );

    const result = await routeEinsatzWarningRecipientsByPreference({
      organizationId: 'org-1',
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
    });

    expect(mockGetEffectiveNotificationSettingsForUsers).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userIds: ['user-immediate', 'user-digest'],
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
        digestTime: '10:00',
        digestSecondTime: '22:00',
      },
    ]);
  });
});
