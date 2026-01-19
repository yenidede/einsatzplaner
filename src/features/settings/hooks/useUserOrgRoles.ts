import { useQuery } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import { getUserOrgRolesAction } from '../users-action';

export function useUserOrgRoles(userId: string | undefined, orgId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.userOrgRoles(userId || '', orgId || ''),
    queryFn: () => {
      return getUserOrgRolesAction(orgId || '', userId || '');
    },
    enabled: !!userId && !!orgId,
  });
}
