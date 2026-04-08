import { randomInt } from 'crypto';
import { compare, hash } from 'bcryptjs';
import type {
  Prisma,
  otp_challenge as OtpChallenge,
} from '@/generated/prisma';
import prisma from '@/lib/prisma';

const OTP_CODE_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60; // 10 Minutes
const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

export const OTP_PENDING_STATUS = 'pending';
export const OTP_VERIFIED_STATUS = 'verified';
export const OTP_INVALIDATED_STATUS = 'invalidated';
export const OTP_CONSUMED_STATUS = 'consumed';

const ACTIVE_OTP_STATUSES = [OTP_PENDING_STATUS, OTP_VERIFIED_STATUS] as const;

export interface OneTimePasswordChallengeResult {
  challengeId: string;
  email: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}

export interface VerifiedOneTimePasswordChallengeResult {
  challengeId: string;
  email: string;
  expiresAt: Date;
  verified: true;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createOtpCode(length: number): string {
  const digits = Array.from({ length }, () => randomInt(0, 10));
  return digits.join('');
}

type OtpTransactionClient = Prisma.TransactionClient;

async function invalidateOpenChallengesByEmail(
  email: string,
  now: Date,
  tx: OtpTransactionClient
) {
  await tx.otp_challenge.updateMany({
    where: {
      email,
      status: {
        in: [...ACTIVE_OTP_STATUSES],
      },
    },
    data: {
      status: OTP_INVALIDATED_STATUS,
      consumed_at: now,
    },
  });

  await tx.otp_code.updateMany({
    where: {
      email,
      consumed_at: null,
      otp_challenge: {
        email,
        status: OTP_INVALIDATED_STATUS,
      },
    },
    data: {
      consumed_at: now,
    },
  });
}

export async function invalidateOneTimePasswordChallenge(
  input: {
    challengeId: string;
    email: string;
  },
  tx: OtpTransactionClient = prisma
) {
  const email = normalizeEmail(input.email);
  const now = new Date();

  await tx.otp_challenge.updateMany({
    where: {
      id: input.challengeId,
      email,
      status: {
        in: [...ACTIVE_OTP_STATUSES],
      },
    },
    data: {
      status: OTP_INVALIDATED_STATUS,
      consumed_at: now,
    },
  });

  await tx.otp_code.updateMany({
    where: {
      email,
      consumed_at: null,
      otp_challenge: {
        id: input.challengeId,
        email,
        status: OTP_INVALIDATED_STATUS,
      },
    },
    data: {
      consumed_at: now,
    },
  });
}

async function getActiveChallengeByEmail(
  email: string,
  tx: OtpTransactionClient = prisma
): Promise<
  | (OtpChallenge & {
    otp_code: {
      id: string;
      code_hash: string;
      expires_at: Date;
      consumed_at: Date | null;
    }[];
  })
  | null
> {
  return tx.otp_challenge.findFirst({
    where: {
      email,
      status: {
        in: [...ACTIVE_OTP_STATUSES],
      },
    },
    include: {
      otp_code: {
        orderBy: {
          expires_at: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      expires_at: 'desc',
    },
  });
}

export async function createAndSendOneTimePasswordChallenge(input: {
  email: string;
}): Promise<OneTimePasswordChallengeResult & { code: string }> {
  const email = normalizeEmail(input.email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
  const resendAvailableAt = new Date(
    now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000
  );
  const code = createOtpCode(OTP_CODE_LENGTH);
  const codeHash = await hash(code, 10);

  const challenge = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;

    const activeChallenge = await getActiveChallengeByEmail(email, tx);

    if (activeChallenge) {
      if (activeChallenge.expires_at <= now) {
        await invalidateOpenChallengesByEmail(email, now, tx);
      } else {
        const activeChallengeCreatedAt = new Date(
          activeChallenge.expires_at.getTime() - OTP_TTL_SECONDS * 1000
        );
        const activeChallengeResendAvailableAt = new Date(
          activeChallengeCreatedAt.getTime() +
            OTP_RESEND_COOLDOWN_SECONDS * 1000
        );

        if (activeChallengeResendAvailableAt > now) {
          throw new Error(
            'Bitte warten Sie kurz, bevor Sie einen neuen Bestätigungscode anfordern.'
          );
        }

        await invalidateOpenChallengesByEmail(email, now, tx);
      }
    }

    return tx.otp_challenge.create({
      data: {
        email,
        status: OTP_PENDING_STATUS,
        attempts: 0,
        expires_at: expiresAt,
        otp_code: {
          create: {
            email,
            code_hash: codeHash,
            expires_at: expiresAt,
          },
        },
      },
    });
  });

  return {
    challengeId: challenge.id,
    email,
    expiresAt,
    resendAvailableAt,
    code,
  };
}

export async function verifyOneTimePasswordChallenge(input: {
  email: string;
  code: string;
}): Promise<VerifiedOneTimePasswordChallengeResult> {
  const email = normalizeEmail(input.email);
  const code = input.code.trim();

  return prisma.$transaction(async (tx) => {
    const challenge = await getActiveChallengeByEmail(email, tx);

    if (!challenge) {
      throw new Error('Es gibt keinen aktiven Bestätigungscode für diese E-Mail-Adresse.');
    }

    const otpCode = challenge.otp_code[0];
    const now = new Date();

    if (!otpCode) {
      throw new Error('Es gibt keinen aktiven Bestätigungscode für diese E-Mail-Adresse.');
    }

    if (challenge.status !== OTP_PENDING_STATUS) {
      throw new Error('Diese Bestätigung wurde bereits abgeschlossen.');
    }

    if (challenge.expires_at <= now || otpCode.expires_at <= now) {
      await invalidateOpenChallengesByEmail(email, now, tx);
      throw new Error('Der Bestätigungscode ist abgelaufen.');
    }

    if (otpCode.consumed_at) {
      throw new Error('Der Bestätigungscode ist nicht mehr gültig.');
    }

    const isValid = await compare(code, otpCode.code_hash);

    if (!isValid) {
      await tx.otp_challenge.updateMany({
        where: {
          id: challenge.id,
          status: OTP_PENDING_STATUS,
          attempts: {
            lt: OTP_MAX_ATTEMPTS,
          },
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      const updatedChallenge = await tx.otp_challenge.findUnique({
        where: { id: challenge.id },
      });

      const attempts = updatedChallenge?.attempts ?? OTP_MAX_ATTEMPTS;
      const shouldInvalidate =
        attempts >= OTP_MAX_ATTEMPTS &&
        updatedChallenge?.status === OTP_PENDING_STATUS;

      if (shouldInvalidate) {
        await invalidateOneTimePasswordChallenge(
          {
            challengeId: challenge.id,
            email,
          },
          tx
        );
        throw new Error(
          'Der Bestätigungscode wurde zu oft falsch eingegeben. Bitte fordern Sie einen neuen Code an.'
        );
      }

      throw new Error('Ungültiger Code. Bitte versuchen Sie es erneut.');
    }

    await tx.otp_challenge.update({
      where: { id: challenge.id },
      data: {
        status: OTP_VERIFIED_STATUS,
      },
    });

    await tx.otp_code.update({
      where: { id: otpCode.id },
      data: {
        consumed_at: now,
      },
    });

    return {
      challengeId: challenge.id,
      email,
      expiresAt: challenge.expires_at,
      verified: true,
    };
  });
}

export async function consumeVerifiedOneTimePasswordChallenge(input: {
  email: string;
  challengeId: string;
},
tx?: OtpTransactionClient
): Promise<{ challengeId: string; email: string; consumedAt: Date }> {
  const email = normalizeEmail(input.email);

  const consumeChallenge = async (executor: OtpTransactionClient) => {
    const challenge = await executor.otp_challenge.findUnique({
      where: {
        id: input.challengeId,
      },
    });

    const now = new Date();

    if (!challenge || challenge.email !== email) {
      throw new Error('Die Bestätigung passt nicht zur angegebenen E-Mail-Adresse.');
    }

    if (challenge.status !== OTP_VERIFIED_STATUS) {
      throw new Error('Die E-Mail-Adresse wurde noch nicht erfolgreich bestätigt.');
    }

    if (challenge.expires_at <= now) {
      await executor.otp_challenge.update({
        where: { id: challenge.id },
        data: {
          status: OTP_INVALIDATED_STATUS,
          consumed_at: now,
        },
      });
      throw new Error('Die bestätigte Challenge ist abgelaufen.');
    }

    const consumedChallenge = await executor.otp_challenge.delete({
      where: {
        id: challenge.id,
      },
    });

    return {
      challengeId: consumedChallenge.id,
      email: consumedChallenge.email,
      consumedAt: now,
    };
  };

  if (tx) {
    return consumeChallenge(tx);
  }

  return prisma.$transaction(async (transactionClient) =>
    consumeChallenge(transactionClient)
  );
}
