import { useQuery } from '@tanstack/react-query';
import { userPropertyQueryKeys } from '@/features/user_properties/queryKeys';
import { getUserPropertiesByOrgId } from '@/features/user_properties/user_property-dal';

export function useUserProperties(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: userPropertyQueryKeys.byOrg(activeOrgId ?? ''),
    queryFn: () => getUserPropertiesByOrgId(activeOrgId ?? ''),
    enabled: !!activeOrgId,
  });
}
