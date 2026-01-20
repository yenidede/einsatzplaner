import { useQuery } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import { getUserProfileAction, getSalutationsAction } from '../settings-action';
import { getUserOrganizationByIdAction } from '../organization-action';
import { getAllUserOrgRolesAction } from '../users-action';

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.user.settings(userId || ''),
    enabled: !!userId,
    queryFn: async () => {
      const res = await getUserProfileAction();
      if (!res) throw new Error('Fehler beim Laden');
      return res;
    },
  });
}

export function useSalutations() {
  return useQuery({
    queryKey: settingsQueryKeys.salutation(),
    queryFn: async () => {
      const res = await getSalutationsAction();
      return res;
    },
  });
}

export function useOrganizationById(orgId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.org.detail(orgId),
    enabled: !!orgId,
    queryFn: () => getUserOrganizationByIdAction(orgId),
  });
}

export function useOrganizationUserRoles(orgId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.org.users(orgId || ''),
    enabled: !!orgId,
    queryFn: () => getAllUserOrgRolesAction(orgId),
  });
}
