import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { GetStatuses } from '../status-dal';

export function useStatuses() {
  return useQuery({
    queryKey: queryKeys.statuses(),
    queryFn: () => GetStatuses(),
  });
}
