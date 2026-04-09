import { hash } from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockTransaction,
  mockExecuteRaw,
  mockChallengeUpdateMany,
  mockCodeUpdateMany,
  mockChallengeCreate,
  mockChallengeFindFirst,
  mockChallengeUpdate,
  mockChallengeDelete,
  mockCodeUpdate,
  mockChallengeFindUnique,
} = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockExecuteRaw: vi.fn(),
  mockChallengeUpdateMany: vi.fn(),
  mockCodeUpdateMany: vi.fn(),
  mockChallengeCreate: vi.fn(),
  mockChallengeFindFirst: vi.fn(),
  mockChallengeUpdate: vi.fn(),
  mockChallengeDelete: vi.fn(),
  mockCodeUpdate: vi.fn(),
  mockChallengeFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mockTransaction,
    otp_challenge: {
      findUnique: mockChallengeFindUnique,
    },
  },
}));

import {
  consumeVerifiedOneTimePasswordChallenge,
  createAndSendOneTimePasswordChallenge,
  OTP_PENDING_STATUS,
  verifyOneTimePasswordChallenge,
  OTP_INVALIDATED_STATUS,
  OTP_VERIFIED_STATUS,
} from '@/features/auth/one-time-password';

describe('one-time-password server logic', () => {
  beforeEach(() => {
    mockChallengeUpdateMany.mockReset();
    mockExecuteRaw.mockReset();
    mockCodeUpdateMany.mockReset();
    mockChallengeCreate.mockReset();
    mockChallengeFindFirst.mockReset();
    mockChallengeUpdate.mockReset();
    mockChallengeDelete.mockReset();
    mockCodeUpdate.mockReset();
    mockChallengeFindUnique.mockReset();
    mockTransaction.mockReset();

    mockTransaction.mockImplementation(
      async (
        callback: (tx: {
          otp_challenge: {
            updateMany: typeof mockChallengeUpdateMany;
            create: typeof mockChallengeCreate;
            findFirst: typeof mockChallengeFindFirst;
            update: typeof mockChallengeUpdate;
            delete: typeof mockChallengeDelete;
            findUnique: typeof mockChallengeFindUnique;
          };
          otp_code: {
            updateMany: typeof mockCodeUpdateMany;
            update: typeof mockCodeUpdate;
          };
          $executeRaw: typeof mockExecuteRaw;
        }) => Promise<unknown>
      ) =>
        callback({
          otp_challenge: {
            updateMany: mockChallengeUpdateMany,
            create: mockChallengeCreate,
            findFirst: mockChallengeFindFirst,
            update: mockChallengeUpdate,
            delete: mockChallengeDelete,
            findUnique: mockChallengeFindUnique,
          },
          otp_code: {
            updateMany: mockCodeUpdateMany,
            update: mockCodeUpdate,
          },
          $executeRaw: mockExecuteRaw,
        })
    );
  });

  it('invalidiert beim neuen Versand frühere offene Challenges derselben E-Mail-Adresse', async () => {
    mockChallengeFindFirst.mockResolvedValue({
      id: 'challenge-old',
      email: 'test@example.com',
      status: OTP_PENDING_STATUS,
      attempts: 0,
      expires_at: new Date(Date.now() + 9 * 60_000),
      consumed_at: null,
      otp_code: [
        {
          id: 'code-old',
          code_hash: 'hash',
          expires_at: new Date(Date.now() + 9 * 60_000),
          consumed_at: null,
        },
      ],
    });
    mockChallengeCreate.mockResolvedValue({
      id: 'challenge-new',
    });

    const result = await createAndSendOneTimePasswordChallenge({
      email: 'Test@Example.com',
    });

    expect(mockExecuteRaw).toHaveBeenCalledOnce();
    expect(mockChallengeUpdateMany).toHaveBeenCalledOnce();
    expect(mockChallengeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'test@example.com',
        }),
        data: expect.objectContaining({
          status: 'invalidated',
        }),
      })
    );
    expect(mockCodeUpdateMany).toHaveBeenCalledOnce();
    expect(mockChallengeCreate).toHaveBeenCalledOnce();
    expect(result.challengeId).toBe('challenge-new');
    expect(result.email).toBe('test@example.com');
    expect(result.code).toMatch(/^\d{6}$/);
  });

  it('lehnt erneuten Versand innerhalb des Cooldowns serverseitig ab', async () => {
    mockChallengeFindFirst.mockResolvedValue({
      id: 'challenge-active',
      email: 'test@example.com',
      status: OTP_PENDING_STATUS,
      attempts: 0,
      expires_at: new Date(Date.now() + 9 * 60_000 + 45_000),
      consumed_at: null,
      otp_code: [
        {
          id: 'code-1',
          code_hash: 'hash',
          expires_at: new Date(Date.now() + 9 * 60_000 + 45_000),
          consumed_at: null,
        },
      ],
    });

    await expect(
      createAndSendOneTimePasswordChallenge({
        email: 'Test@Example.com',
      })
    ).rejects.toThrow('Bitte warten Sie kurz');

    expect(mockChallengeUpdateMany).not.toHaveBeenCalled();
    expect(mockCodeUpdateMany).not.toHaveBeenCalled();
    expect(mockChallengeCreate).not.toHaveBeenCalled();
  });

  it('erhöht bei einem falschen Code die Versuchsanzahl', async () => {
    const codeHash = await hash('654321', 10);
    const expiresAt = new Date(Date.now() + 60_000);
    mockChallengeFindFirst.mockResolvedValue({
      id: 'challenge-1',
      email: 'david@example.com',
      status: 'pending',
      attempts: 1,
      expires_at: expiresAt,
      consumed_at: null,
      otp_code: [
        {
          id: 'code-1',
          code_hash: codeHash,
          expires_at: expiresAt,
          consumed_at: null,
        },
      ],
    });
    mockChallengeFindUnique.mockResolvedValue({
      id: 'challenge-1',
      email: 'david@example.com',
      status: OTP_PENDING_STATUS,
      attempts: 2,
      expires_at: expiresAt,
      consumed_at: null,
    });

    await expect(
      verifyOneTimePasswordChallenge({
        email: 'david@example.com',
        code: '123456',
      })
    ).rejects.toThrow('Ungültiger Code. Bitte versuchen Sie es erneut.');

    expect(mockChallengeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'challenge-1',
          status: OTP_PENDING_STATUS,
        }),
        data: expect.objectContaining({
          attempts: {
            increment: 1,
          },
        }),
      })
    );
  });

  it('invalidiert die Challenge, sobald die maximale Anzahl an Fehlversuchen erreicht ist', async () => {
    const codeHash = await hash('654321', 10);
    const expiresAt = new Date(Date.now() + 60_000);

    mockChallengeFindFirst.mockResolvedValue({
      id: 'challenge-max',
      email: 'david@example.com',
      status: OTP_PENDING_STATUS,
      attempts: 4,
      expires_at: expiresAt,
      consumed_at: null,
      otp_code: [
        {
          id: 'code-max',
          code_hash: codeHash,
          expires_at: expiresAt,
          consumed_at: null,
        },
      ],
    });
    mockChallengeFindUnique.mockResolvedValue({
      id: 'challenge-max',
      email: 'david@example.com',
      status: OTP_PENDING_STATUS,
      attempts: 5,
      expires_at: expiresAt,
      consumed_at: null,
    });

    await expect(
      verifyOneTimePasswordChallenge({
        email: 'david@example.com',
        code: '123456',
      })
    ).rejects.toThrow('zu oft falsch eingegeben');

    expect(mockChallengeUpdateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'challenge-max',
        }),
        data: {
          attempts: {
            increment: 1,
          },
        },
      })
    );
    expect(mockChallengeUpdateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'challenge-max',
          email: 'david@example.com',
        }),
        data: expect.objectContaining({
          status: OTP_INVALIDATED_STATUS,
        }),
      })
    );
    expect(mockCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: 'david@example.com',
        }),
      })
    );
  });

  it('setzt bei einem richtigen Code den Status auf verified', async () => {
    const codeHash = await hash('123456', 10);
    const expiresAt = new Date(Date.now() + 60_000);
    mockChallengeFindFirst.mockResolvedValue({
      id: 'challenge-verified',
      email: 'david@example.com',
      status: 'pending',
      attempts: 0,
      expires_at: expiresAt,
      consumed_at: null,
      otp_code: [
        {
          id: 'code-1',
          code_hash: codeHash,
          expires_at: expiresAt,
          consumed_at: null,
        },
      ],
    });

    const result = await verifyOneTimePasswordChallenge({
      email: 'david@example.com',
      code: '123456',
    });

    expect(mockChallengeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'challenge-verified' },
        data: expect.objectContaining({
          status: OTP_VERIFIED_STATUS,
        }),
      })
    );
    expect(mockCodeUpdate).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      challengeId: 'challenge-verified',
      verified: true,
    });
  });

  it('weist abgelaufene verifizierte Challenges beim Konsumieren ab', async () => {
    mockChallengeFindUnique.mockResolvedValue({
      id: 'challenge-expired',
      email: 'david@example.com',
      status: OTP_VERIFIED_STATUS,
      attempts: 0,
      expires_at: new Date(Date.now() - 60_000),
      consumed_at: null,
    });

    await expect(
      consumeVerifiedOneTimePasswordChallenge({
        email: 'david@example.com',
        challengeId: 'challenge-expired',
      })
    ).rejects.toThrow('abgelaufen');

    expect(mockChallengeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'challenge-expired' },
        data: expect.objectContaining({
          status: OTP_INVALIDATED_STATUS,
        }),
      })
    );
  });

  it('konsumiert nur eine passende verifizierte Challenge', async () => {
    mockChallengeFindUnique.mockResolvedValue({
      id: 'challenge-match',
      email: 'david@example.com',
      status: OTP_VERIFIED_STATUS,
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: null,
    });
    mockChallengeDelete.mockResolvedValue({
      id: 'challenge-match',
      email: 'david@example.com',
      status: 'verified',
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
      consumed_at: new Date(),
    });

    const result = await consumeVerifiedOneTimePasswordChallenge({
      email: 'david@example.com',
      challengeId: 'challenge-match',
    });

    expect(result.challengeId).toBe('challenge-match');
    expect(mockChallengeDelete).toHaveBeenCalledWith({
      where: {
        id: 'challenge-match',
      },
    });

    await expect(
      consumeVerifiedOneTimePasswordChallenge({
        email: 'falsch@example.com',
        challengeId: 'challenge-match',
      })
    ).rejects.toThrow('passt nicht');
  });
});
