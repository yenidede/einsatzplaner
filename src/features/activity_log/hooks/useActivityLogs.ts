import { useQuery } from '@tanstack/react-query';
import { activityLogQueryKeys } from '../queryKeys';
import {
  getActivitiesForEinsatzAction,
  getActivityLogsAction,
  getChangeTypesAction,
} from '../activity_log-actions';
import type { ActivityLogFilters } from '../types';

export function useActivityLogs(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: activityLogQueryKeys.list(params),
    queryFn: async () => {
      const result = await getActivityLogsAction(params);
      return result.data?.activities || [];
    },
    staleTime: 1 * 60 * 1000, // check for new notifications every minute
  });
}

export function useActivityLogsFiltered(
  filters: ActivityLogFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: activityLogQueryKeys.listFiltered(filters),
    queryFn: async () => {
      const result = await getActivityLogsAction(filters);
      return {
        activities: result.data?.activities || [],
        total: result.data?.total ?? 0,
        hasMore: result.data?.hasMore ?? false,
      };
    },
    enabled,
    staleTime: 1 * 60 * 1000,
  });
}

export function useChangeTypes(enabled: boolean = true) {
  return useQuery({
    queryKey: activityLogQueryKeys.changeTypes,
    queryFn: async () => {
      const result = await getChangeTypesAction();
      return result.data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEinsatzActivityLogs(
  einsatzId: string | null | undefined,
  limit: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: activityLogQueryKeys.einsatz(einsatzId ?? '', limit),
    queryFn: () => getActivitiesForEinsatzAction(einsatzId ?? '', limit),
    enabled: !!einsatzId && enabled,
  });
}
