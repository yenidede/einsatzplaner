import prisma from '@/lib/prisma';

export type SelfServeSignupAccountMode =
  | 'new-account'
  | 'existing-account'
  | 'authenticated-user';

export interface AccountLookupClient {
  user: {
    findFirst(args: {
      where: {
        email: {
          equals: string;
          mode: 'insensitive';
        };
      };
      select: {
        id: boolean;
      };
    }): Promise<{ id: string } | null>;
  };
}

export async function resolveSelfServeSignupAccountMode(
  email: string,
  options?: {
    currentUserEmail?: string | null;
    db?: AccountLookupClient;
  }
): Promise<SelfServeSignupAccountMode> {
  const currentUserEmail = options?.currentUserEmail?.trim();

  if (currentUserEmail) {
    return 'authenticated-user';
  }

  const db = options?.db ?? prisma;
  const normalizedEmail = email.trim();

  const existingUser = await db.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  return existingUser ? 'existing-account' : 'new-account';
}
