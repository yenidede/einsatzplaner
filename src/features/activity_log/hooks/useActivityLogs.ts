import { useQuery } from '@tanstack/react-query';
import { activityLogQueryKeys } from '../queryKeys';
import { getActivityLogs } from '../activity_log-dal';
import {
  getActivitiesForEinsatzAction,
  getActivityLogsAction,
} from '../activity_log-actions';

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
