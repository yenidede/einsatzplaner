import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const {
  mockCompare,
  mockCreateAndSendOneTimePasswordChallenge,
  mockHash,
  mockGetServerSession,
  mockInvalidateOneTimePasswordChallenge,
  mockSendPasswordResetEmail,
  mockSendSelfSignupOrganizationCreatedNotificationEmail,
  mockSendOneTimePasswordEmail,
  mockTransaction,
  mockUserFindUnique,
  mockConsumeVerifiedOneTimePasswordChallenge,
} = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockCreateAndSendOneTimePasswordChallenge: vi.fn(),
  mockHash: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockInvalidateOneTimePasswordChallenge: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockSendSelfSignupOrganizationCreatedNotificationEmail: vi.fn(),
  mockSendOneTimePasswordEmail: vi.fn(),
  mockTransaction: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockConsumeVerifiedOneTimePasswordChallenge: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  compare: mockCompare,
  hash: mockHash,
}));

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/email/EmailService', () => ({
  emailService: {
    sendPasswordResetEmail: mockSendPasswordResetEmail,
    sendSelfSignupOrganizationCreatedNotificationEmail:
      mockSendSelfSignupOrganizationCreatedNotificationEmail,
    sendOneTimePasswordEmail: mockSendOneTimePasswordEmail,
  },
}));

vi.mock('@/features/auth/one-time-password', () => ({
  createAndSendOneTimePasswordChallenge:
    mockCreateAndSendOneTimePasswordChallenge,
  verifyOneTimePasswordChallenge: vi.fn(),
  invalidateOneTimePasswordChallenge: mockInvalidateOneTimePasswordChallenge,
  consumeVerifiedOneTimePasswordChallenge:
    mockConsumeVerifiedOneTimePasswordChallenge,
}));

vi.mock('@/lib/auth.config', () => ({
  authOptions: {},
}));

vi.mock('@/features/auth/register-schema', () => ({
  formSchema: z.object({
    invitationId: z.string(),
    email: z.string(),
    passwort: z.string(),
    vorname: z.string(),
    nachname: z.string(),
    telefon: z.string().optional(),
    anredeId: z.string().optional(),
    pictureUrl: z.string().optional(),
  }),
}));

vi.mock('@/DataAccessLayer/user', () => ({
  getUserWithValidResetToken: vi.fn(),
  resetUserPassword: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUserResetToken: vi.fn(),
  createUserWithOrgAndRoles: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mockTransaction,
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

import {
  createSelfSignupAction,
  sendOneTimePasswordAction,
} from '@/features/auth/actions';

describe('createSelfSignupAction', () => {
  beforeEach(() => {
    mockCompare.mockReset();
    mockCreateAndSendOneTimePasswordChallenge.mockReset();
    mockHash.mockReset();
    mockGetServerSession.mockReset();
    mockInvalidateOneTimePasswordChallenge.mockReset();
    mockSendPasswordResetEmail.mockReset();
    mockSendSelfSignupOrganizationCreatedNotificationEmail.mockReset();
    mockSendOneTimePasswordEmail.mockReset();
    mockTransaction.mockReset();
    mockUserFindUnique.mockReset();
    mockConsumeVerifiedOneTimePasswordChallenge.mockReset();

    mockHash.mockResolvedValue('hashed-password');
    mockUserFindUnique.mockResolvedValue(null);
    mockCreateAndSendOneTimePasswordChallenge.mockResolvedValue({
      challengeId: 'challenge-1',
      email: 'david@example.com',
      expiresAt: new Date('2026-04-08T18:00:00.000Z'),
      resendAvailableAt: new Date('2026-04-08T17:30:30.000Z'),
      code: '123456',
    });
    const mockOrganizationCreate = vi.fn().mockResolvedValue({
      id: 'org-1',
      name: 'Jüdisches Museum Hohenems',
      logo_url: null,
    });
    const mockRoleFindMany = vi.fn().mockResolvedValue([{ id: 'role-1' }]);

    mockTransaction.mockImplementation(
      async (
        callback: (tx: {
          user: {
            findUnique: typeof mockUserFindUnique;
            create: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
          };
          organization: {
            create: ReturnType<typeof vi.fn>;
          };
          organization_details: {
            create: ReturnType<typeof vi.fn>;
          };
          role: {
            findMany: ReturnType<typeof vi.fn>;
          };
        }) => Promise<unknown>
      ) =>
        callback({
          user: {
            findUnique: mockUserFindUnique,
            create: vi.fn(),
            update: vi.fn(),
          },
          organization: {
            create: mockOrganizationCreate,
          },
          organization_details: {
            create: vi.fn(),
          },
          role: {
            findMany: mockRoleFindMany,
          },
        })
    );
  });

  it('verbraucht die verifizierte OTP-Challenge nicht, wenn das Konto inzwischen bereits existiert', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'existing-user',
    });

    const result = await createSelfSignupAction({
      accountMode: 'new',
      organizationName: 'Jüdisches Museum Hohenems',
      firstName: 'David',
      lastName: 'Kathrein',
      email: 'david@example.com',
      password: 'geheimespasswort',
      challengeId: '7f4c9d44-74b0-4b32-8668-6a38ab30b578',
    });

    expect(result?.serverError).toContain(
      'Es existiert bereits ein Konto mit dieser E-Mail-Adresse.'
    );
    expect(mockConsumeVerifiedOneTimePasswordChallenge).not.toHaveBeenCalled();
    expect(
      mockSendSelfSignupOrganizationCreatedNotificationEmail
    ).not.toHaveBeenCalled();
  });

  it('sendet nach erfolgreicher Selbstregistrierung eine interne Benachrichtigung über die neue Organisation', async () => {
    const result = await createSelfSignupAction({
      accountMode: 'new',
      organizationName: 'Jüdisches Museum Hohenems',
      firstName: 'David',
      lastName: 'Kathrein',
      email: 'David@example.com',
      password: 'geheimespasswort',
      challengeId: '7f4c9d44-74b0-4b32-8668-6a38ab30b578',
    });

    expect(result?.data?.success).toBe(true);
    expect(
      mockSendSelfSignupOrganizationCreatedNotificationEmail
    ).toHaveBeenCalledWith({
      recipientEmail: 'hello@davidkathrein.at',
      organizationName: 'Jüdisches Museum Hohenems',
      creatorName: 'David Kathrein',
      creatorEmail: 'david@example.com',
    });
  });

  it('lässt die Selbstregistrierung erfolgreich durchlaufen, wenn die interne Benachrichtigung nicht versendet werden kann', async () => {
    mockSendSelfSignupOrganizationCreatedNotificationEmail.mockRejectedValueOnce(
      new Error('SMTP nicht erreichbar')
    );

    const result = await createSelfSignupAction({
      accountMode: 'new',
      organizationName: 'Jüdisches Museum Hohenems',
      firstName: 'David',
      lastName: 'Kathrein',
      email: 'david@example.com',
      password: 'geheimespasswort',
      challengeId: '7f4c9d44-74b0-4b32-8668-6a38ab30b578',
    });

    expect(result?.data?.success).toBe(true);
    expect(
      mockSendSelfSignupOrganizationCreatedNotificationEmail
    ).toHaveBeenCalledOnce();
  });

  it('invalidiert die OTP-Challenge wieder, wenn der E-Mail-Versand fehlschlägt', async () => {
    mockSendOneTimePasswordEmail.mockRejectedValueOnce(
      new Error('SMTP backend unavailable')
    );

    const result = await sendOneTimePasswordAction({
      email: 'David@example.com',
    });

    expect(mockCreateAndSendOneTimePasswordChallenge).toHaveBeenCalledWith({
      email: 'David@example.com',
    });
    expect(mockInvalidateOneTimePasswordChallenge).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      email: 'david@example.com',
    });
    expect(result?.serverError).toBe(
      'Der Bestätigungscode konnte nicht gesendet werden. Bitte versuchen Sie es erneut.'
    );
  });
});
