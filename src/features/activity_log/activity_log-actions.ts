"use server";

import { requireAuth } from "@/lib/auth/authGuard";
import {
  getActivities,
  getActivityLogs,
  getEinsatzActivityLogs,
  createChangeLog,
} from "./activity_log-dal";
import type { CreateChangeLogInput, ActivityLogFilters } from "./types";

export async function getActivitiesAction() {
  try {
    const { session } = await requireAuth();
    const orgId = session.user.activeOrganization?.id;

    if (!orgId) {
      return { success: false, error: "Keine Organisation gefunden" };
    }

    const activities = await getActivities(orgId);

    return { success: true, data: activities };
  } catch (error) {
    console.error("Error fetching activities:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getActivityLogsAction(filters?: ActivityLogFilters) {
  try {
    await requireAuth();

    const result = await getActivityLogs(filters);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function getEinsatzActivityLogsAction(einsatzId: string) {
  try {
    await requireAuth();

    const result = await getEinsatzActivityLogs(einsatzId);

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching einsatz activity logs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

export async function createActivityLogAction(input: CreateChangeLogInput) {
  try {
    await requireAuth();

    const log = await createChangeLog(input);

    return { success: true, data: log };
  } catch (error) {
    console.error("Error creating activity log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
