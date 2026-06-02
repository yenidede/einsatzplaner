'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  getOrCreateCalendarSubscription,
  rotateCalendarSubscription,
  deactivateCalendarSubscription,
  activateCalendarSubscription,
  buildCalendarSubscriptionUrl,
  buildWebcalUrl,
} from './calendarSubscription';

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Sie sind nicht angemeldet.');
  return session;
}

export async function getSubscriptionAction(orgId: string) {
  const session = await checkUserSession();

  const response = await getOrCreateCalendarSubscription(
    orgId,
    session.user.id
  );
  if (!response)
    throw new Error('Die Kalenderintegration konnte nicht geladen werden.');

  return {
    id: response.id,
    name: response.name ?? '',
    is_active: response.is_active,
    token: response.token,
    webcalUrl: buildWebcalUrl(response.token),
    httpUrl: buildCalendarSubscriptionUrl(response.token),
    last_accessed: response.last_accessed?.toString() ?? null,
  };
}

export async function rotateSubscriptionAction(id: string) {
  const session = await checkUserSession();
  const response = await rotateCalendarSubscription(id, session.user.id);
  if (!response)
    throw new Error('Der neue Kalender-Link konnte nicht erstellt werden.');

  return {
    id: response.id,
    token: response.token,
    webcalUrl: buildWebcalUrl(response.token),
    httpUrl: buildCalendarSubscriptionUrl(response.token),
  };
}

export async function deactivateSubscriptionAction(id: string) {
  const session = await checkUserSession();

  const response = await deactivateCalendarSubscription(id, session.user.id);
  if (!response)
    throw new Error('Die Kalenderintegration konnte nicht deaktiviert werden.');

  return {
    id: response.id,
    is_active: response.is_active,
  };
}

export async function activateSubscriptionAction(id: string) {
  const session = await checkUserSession();

  const response = await activateCalendarSubscription(id, session.user.id);
  if (!response)
    throw new Error('Die Kalenderintegration konnte nicht aktiviert werden.');

  return {
    id: response.id,
    is_active: response.is_active,
  };
}
