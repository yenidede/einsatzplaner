import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/user/queryKeys';
import { getAllUsersWithRolesByOrgId, getAllUsersWithRolesByOrgIds } from '@/features/user/user-dal';

export function useUsers(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.user(activeOrgId ?? ''),
    queryFn: () => {
      return getAllUsersWithRolesByOrgId(activeOrgId ?? '');
    },
    enabled: !!activeOrgId,
    select: (data) => {
      return data.map((user) => ({
        ...user,
        user_property_value: (user as any).user_property_value || [],
      }));
    },
  });
}

export function useUsersByOrgIds(orgIds: string[]) {
  return useQuery({
    queryKey: queryKeys.users(orgIds),
    queryFn: () => getAllUsersWithRolesByOrgIds(orgIds),
    enabled: orgIds.length > 0,
  });
}
