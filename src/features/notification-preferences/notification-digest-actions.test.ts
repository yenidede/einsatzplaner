import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetServerSession, mockProcessNotificationDigestQueue } = vi.hoisted(
  () => ({
    mockGetServerSession: vi.fn(),
    mockProcessNotificationDigestQueue: vi.fn(),
  })
);

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth.config', () => ({
  authOptions: {},
}));

vi.mock('@/lib/auth/authGuard', () => ({
  ROLE_NAME_MAP: {
    Superadmin: 'superadmin-role-id',
  },
}));

vi.mock('./notification-email-digest-dal', () => ({
  processNotificationDigestQueue: mockProcessNotificationDigestQueue,
}));

import { processNotificationDigestsAction } from './notification-digest-actions';

describe('processNotificationDigestsAction', () => {
  beforeEach(() => {
    mockProcessNotificationDigestQueue.mockResolvedValue({
      queuedItems: 3,
      sentItems: 2,
      skippedItems: 1,
    });
  });

  it('führt die Verarbeitung für Superadmin aus', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        roleIds: ['superadmin-role-id'],
      },
    });

    const result = await processNotificationDigestsAction({ limit: 50 });

    expect(mockProcessNotificationDigestQueue).toHaveBeenCalledWith({
      limit: 50,
    });
    expect(result).toEqual({
      queuedItems: 3,
      sentItems: 2,
      skippedItems: 1,
    });
  });

  it('lehnt Aufruf ohne Superadmin-Rolle ab', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        roleIds: ['einsatz-role-id'],
      },
    });

    await expect(
      processNotificationDigestsAction({ limit: 10 })
    ).rejects.toThrow(
      'Sie haben keine Berechtigung, den Sammelmail-Versand auszuführen.'
    );
  });
});
