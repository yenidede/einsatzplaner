import prisma from '@/lib/prisma';
import { generatedToken } from '@/lib/token';

export async function getOrCreateCalendarSubscription(
  orgId: string,
  userId: string
) {
  if (!orgId || !userId) {
    throw new Error('Invalid orgId or userId');
  }

  const existingCalendarSubscription =
    await prisma.calendar_subscription.findFirst({
      where: { org_id: orgId, user_id: userId, is_active: true },
    });
  if (existingCalendarSubscription) {
    return existingCalendarSubscription;
  }
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  return prisma.calendar_subscription.create({
    data: {
      user_id: userId,
      org_id: orgId,
      token: generatedToken(24),
      name: organization?.name,
      is_active: true,
    },
  });
}

export async function rotateCalendarSubscription(id: string, userId: string) {
  if (!id || !userId) {
    throw new Error('Invalid orgId or userId');
  }

  return prisma.calendar_subscription.update({
    where: { id, user_id: userId },
    data: { token: generatedToken(24), is_active: true },
  });
}

export async function deactivateCalendarSubscription(id: string, userId: string) {
  if (!id || !userId) {
    throw new Error('Invalid orgId or userId');
  }

  return prisma.calendar_subscription.update({
    where: { id, user_id: userId },
    data: { is_active: false },
  });
}

export async function activateCalendarSubscription(id: string, userId: string) {
  if (!id || !userId) {
    throw new Error('Invalid orgId or userId');
  }

  return prisma.calendar_subscription.update({
    where: { id, user_id: userId },
    data: { is_active: true },
  });
}

export function buildCalendarSubscriptionUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL is not defined');
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}/api/calendar/${token}`;
}

export function buildWebcalUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL is not defined');
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `webcal://${base.replace(/^https?:\/\//, '')}/api/calendar/${token}`;
}
