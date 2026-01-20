import { useQuery } from '@tanstack/react-query';
import { activityLogQueryKeys } from '../queryKeys';
import { getActivityLogs } from '../activity_log-dal';

export function useActivityLogs(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: activityLogQueryKeys.list(params),
    queryFn: async () => {
      const result = await getActivityLogs(params);
      return result.activities;
    },
    staleTime: 1 * 60 * 1000, // check for new notifications every minute
  });
}
