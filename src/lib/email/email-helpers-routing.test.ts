import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    mockGetEffectiveNotificationSettingsForUsers.mockReset();
  });

  it('ordnet Empfaenger anhand der effektiven Einstellungen korrekt zu', async () => {
    mockGetEffectiveNotificationSettingsForUsers.mockResolvedValue(
      new Map([
        [
          'user-immediate',
          {
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
        ],
        [
          'user-digest',
          {
            emailEnabled: true,
            deliveryMode: 'digest_only',
            minimumPriority: 'critical',
            urgentDelivery: 'digest',
            importantDelivery: 'immediate',
            generalDelivery: 'off',
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

  it('liefert bei leerer Empfaengerliste keine Ergebnisse', async () => {
    mockGetEffectiveNotificationSettingsForUsers.mockResolvedValue(new Map());

    const result = await routeEinsatzWarningRecipientsByPreference({
      organizationId: 'org-empty',
      recipients: [],
    });

    expect(mockGetEffectiveNotificationSettingsForUsers).toHaveBeenCalledWith({
      organizationId: 'org-empty',
      userIds: [],
    });
    expect(result.immediateRecipients).toEqual([]);
    expect(result.digestRecipients).toEqual([]);
  });

  it('ordnet alle Empfaenger als immediate ein, wenn alle auf critical_and_digest stehen', async () => {
    mockGetEffectiveNotificationSettingsForUsers.mockResolvedValue(
      new Map([
        [
          'user-a',
          {
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
        ],
        [
          'user-b',
          {
            emailEnabled: true,
            deliveryMode: 'critical_and_digest',
            minimumPriority: 'info',
            urgentDelivery: 'immediate',
            importantDelivery: 'digest',
            generalDelivery: 'digest',
            digestInterval: 'daily',
            digestTime: '09:00',
            digestSecondTime: '16:00',
          },
        ],
      ])
    );

    const result = await routeEinsatzWarningRecipientsByPreference({
      organizationId: 'org-immediate',
      recipients: [
        { userId: 'user-a', email: 'a@example.com', name: 'User A' },
        { userId: 'user-b', email: 'b@example.com', name: 'User B' },
      ],
    });

    expect(result.immediateRecipients).toEqual([
      { email: 'a@example.com', name: 'User A' },
      { email: 'b@example.com', name: 'User B' },
    ]);
    expect(result.digestRecipients).toEqual([]);
  });

  it('ordnet alle Empfaenger als digest ein, wenn alle auf digest_only stehen', async () => {
    mockGetEffectiveNotificationSettingsForUsers.mockResolvedValue(
      new Map([
        [
          'user-a',
          {
            emailEnabled: true,
            deliveryMode: 'digest_only',
            minimumPriority: 'critical',
            urgentDelivery: 'digest',
            importantDelivery: 'immediate',
            generalDelivery: 'off',
            digestInterval: 'every_2_days',
            digestTime: '10:00',
            digestSecondTime: '16:00',
          },
        ],
        [
          'user-b',
          {
            emailEnabled: true,
            deliveryMode: 'digest_only',
            minimumPriority: 'review',
            urgentDelivery: 'digest',
            importantDelivery: 'immediate',
            generalDelivery: 'off',
            digestInterval: 'daily',
            digestTime: '07:00',
            digestSecondTime: '16:00',
          },
        ],
      ])
    );

    const result = await routeEinsatzWarningRecipientsByPreference({
      organizationId: 'org-digest',
      recipients: [
        { userId: 'user-a', email: 'a@example.com', name: 'User A' },
        { userId: 'user-b', email: 'b@example.com', name: 'User B' },
      ],
    });

    expect(result.immediateRecipients).toEqual([]);
    expect(result.digestRecipients).toEqual([
      {
        userId: 'user-a',
        email: 'a@example.com',
        name: 'User A',
        digestInterval: 'every_2_days',
        digestTime: '10:00',
        digestSecondTime: '16:00',
      },
      {
        userId: 'user-b',
        email: 'b@example.com',
        name: 'User B',
        digestInterval: 'daily',
        digestTime: '07:00',
        digestSecondTime: '16:00',
      },
    ]);
  });

  it('laesst Empfaenger mit deaktivierten E-Mails aus', async () => {
    mockGetEffectiveNotificationSettingsForUsers.mockResolvedValue(
      new Map([
        [
          'user-disabled',
          {
            emailEnabled: false,
            deliveryMode: 'critical_and_digest',
            minimumPriority: 'review',
            urgentDelivery: 'immediate',
            importantDelivery: 'immediate',
            generalDelivery: 'off',
            digestInterval: 'daily',
            digestTime: '08:00',
            digestSecondTime: '16:00',
          },
        ],
      ])
    );

    const result = await routeEinsatzWarningRecipientsByPreference({
      organizationId: 'org-disabled',
      recipients: [
        {
          userId: 'user-disabled',
          email: 'disabled@example.com',
          name: 'Disabled User',
        },
      ],
    });

    expect(result.immediateRecipients).toEqual([]);
    expect(result.digestRecipients).toEqual([]);
  });
});
