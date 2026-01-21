import { useQuery } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import { getUserOrgRolesAction } from '../users-action';

export function useUserOrgRoles(
  organizationId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: settingsQueryKeys.org.userRoles(
      organizationId || '',
      userId || ''
    ),
    queryFn: async () =>
      await getUserOrgRolesAction(organizationId || '', userId || ''),
    enabled: !!userId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}
