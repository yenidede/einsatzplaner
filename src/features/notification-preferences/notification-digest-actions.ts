'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { ROLE_NAME_MAP } from '@/lib/auth/authGuard';
import { processNotificationDigestQueue } from './notification-email-digest-dal';

type ProcessNotificationDigestsInput = {
  limit?: number;
};

function normalizeLimit(limit: number | undefined): number | undefined {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return undefined;
  }

  return Math.floor(limit);
}

export async function processNotificationDigestsAction(
  input: ProcessNotificationDigestsInput = {}
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Sie sind nicht angemeldet.');
  }

  const userRoleIds = session.user.roleIds ?? [];
  if (!userRoleIds.includes(ROLE_NAME_MAP.Superadmin)) {
    throw new Error(
      'Sie haben keine Berechtigung, den Sammelmail-Versand auszuführen.'
    );
  }

  const limit = normalizeLimit(input.limit);
  return processNotificationDigestQueue(limit ? { limit } : undefined);
}
