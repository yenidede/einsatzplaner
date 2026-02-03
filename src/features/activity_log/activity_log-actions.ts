'use server';

import { requireAuth } from '@/lib/auth/authGuard';
import {
  getActivities,
  getActivityLogs,
  getEinsatzActivityLogs,
  createChangeLog,
  getChangeTypes,
} from './activity_log-dal';
import type { CreateChangeLogInput, ActivityLogFilters } from './types';

export async function getActivitiesAction() {
  try {
    const { session } = await requireAuth();
    const orgId = session.user.activeOrganization?.id;

    if (!orgId) {
      return { success: false, error: 'Keine Organisation gefunden' };
    }

    const activities = await getActivities(orgId);

    return { success: true, data: activities };
  } catch (error) {
    console.error('Error fetching activities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function getActivitiesForEinsatzAction(
  einsatzId: string,
  limit?: number
) {
  try {
    await requireAuth();

    const activities = await getEinsatzActivityLogs(einsatzId, limit);

    return { success: true, data: activities };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function getActivityLogsAction(filters?: ActivityLogFilters) {
  try {
    const { session } = await requireAuth();

    const userOrgIds = session.user.orgIds || [];

    if (userOrgIds.length === 0) {
      return { success: false, error: 'Keine Organisationen gefunden' };
    }

    let allowedOrgIds = userOrgIds;
    if (filters?.orgId) {
      if (!userOrgIds.includes(filters.orgId)) {
        return {
          success: false,
          error: 'Keine Berechtigung für diese Organisation',
        };
      }
      allowedOrgIds = [filters.orgId];
    }

    const allActivities = await Promise.all(
      allowedOrgIds.map((orgId) =>
        getActivityLogs({
          ...filters,
          orgId,
        })
      )
    );

    const combinedActivities = allActivities
      .flatMap((result) => result.activities)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, filters?.limit || 50);

    const total = allActivities.reduce((sum, result) => sum + result.total, 0);

    return {
      success: true,
      data: {
        activities: combinedActivities,
        total,
        hasMore: combinedActivities.length < total,
      },
    };
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function getEinsatzActivityLogsAction(einsatzId: string) {
  try {
    await requireAuth();

    const result = await getEinsatzActivityLogs(einsatzId);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching einsatz activity logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function createActivityLogAction(input: CreateChangeLogInput) {
  try {
    await requireAuth();

    const log = await createChangeLog(input);

    return { success: true, data: log };
  } catch (error) {
    console.error('Error creating activity log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export async function getChangeTypesAction() {
  try {
    await requireAuth();
    const types = await getChangeTypes();
    return { success: true, data: types };
  } catch (error) {
    console.error('Error fetching change types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}
