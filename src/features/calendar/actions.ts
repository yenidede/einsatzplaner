"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import {
  getOrCreateCalendarSubscription,
  rotateCalendarSubscription,
  deactivateCalendarSubscription,
  buildCalendarSubscriptionUrl,
  buildWebcalUrl,
} from "./calendarSubscription";
import { httpUrl } from "zod";

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function getSubscriptionAction(orgId: string) {
  const session = await checkUserSession();

  const response = await getOrCreateCalendarSubscription(
    orgId,
    session.user.id
  );
  if (!response)
    throw new Error("Failed to get or create calendar subscription");

  return {
    id: response.id,
    name: response.name ?? "",
    is_active: response.is_active,
    token: response.token,
    webcalUrl: buildWebcalUrl(response.token),
    httpUrl: buildCalendarSubscriptionUrl(response.token),
    last_accessed: response.last_accessed?.toString() ?? null,
  };
}

export async function rotateSubscriptionAction(id: string) {
  const session = await checkUserSession();
  const response = await rotateCalendarSubscription(id);
  if (!response) throw new Error("Failed to rotate calendar subscription");

  return {
    id: response.id,
    token: response.token,
    webcalUrl: buildWebcalUrl(response.token),
    httpUrl: buildCalendarSubscriptionUrl(response.token),
  };
}

export async function deactivateSubscriptionAction(id: string) {
  const session = await checkUserSession();

  const response = await deactivateCalendarSubscription(id);
  if (!response) throw new Error("Failed to deactivate calendar subscription");

  return {
    id: response.id,
    is_active: response.is_active,
  };
}
