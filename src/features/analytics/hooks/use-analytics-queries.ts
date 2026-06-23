import { useQuery } from '@tanstack/react-query';
import { analyticsQueryKeys } from '@/features/analytics/queryKeys';
import { getAnalyticsChartsAction } from '@/features/analytics/analytics-actions';

export function useAnalyticsCharts(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: analyticsQueryKeys.byOrg(activeOrgId ?? ''),
    queryFn: () => getAnalyticsChartsAction(activeOrgId ?? ''),
    enabled: !!activeOrgId,
  });
}
