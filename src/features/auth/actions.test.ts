import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const {
  mockCompare,
  mockHash,
  mockGetServerSession,
  mockSendPasswordResetEmail,
  mockSendOneTimePasswordEmail,
  mockTransaction,
  mockUserFindUnique,
  mockConsumeVerifiedOneTimePasswordChallenge,
} = vi.hoisted(() => ({
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
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
    sendOneTimePasswordEmail: mockSendOneTimePasswordEmail,
  },
}));

vi.mock('@/features/auth/one-time-password', () => ({
  createAndSendOneTimePasswordChallenge: vi.fn(),
  verifyOneTimePasswordChallenge: vi.fn(),
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

import { createSelfSignupAction } from '@/features/auth/actions';

describe('createSelfSignupAction', () => {
  beforeEach(() => {
    mockCompare.mockReset();
    mockHash.mockReset();
    mockGetServerSession.mockReset();
    mockSendPasswordResetEmail.mockReset();
    mockSendOneTimePasswordEmail.mockReset();
    mockTransaction.mockReset();
    mockUserFindUnique.mockReset();
    mockConsumeVerifiedOneTimePasswordChallenge.mockReset();

    mockHash.mockResolvedValue('hashed-password');
    mockUserFindUnique.mockResolvedValue(null);

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
            create: vi.fn(),
          },
          organization_details: {
            create: vi.fn(),
          },
          role: {
            findMany: vi.fn(),
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
  });
});
