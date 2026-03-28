import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import {
  getUserProfileAction,
  getSalutationsAction,
  getUserProfileByIdAction,
} from '../settings-action';
import {
  getUserOrganizationByIdAction,
  getUserManagedOrganizationsAction,
} from '../organization-action';
import {
  getAllUserOrgRolesAction,
  getUserOrgRolesAction,
} from '../users-action';
import { getUserPropertyValuesAction } from '@/features/user_properties/user_property-actions';
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.user.settings(userId || ''),
    enabled: !!userId,
    queryFn: async () => {
      const res = await getUserProfileAction();
      if (!res) throw new Error('Fehler beim Laden der Benutzerdaten.');
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

export function useUserProfileById(
  userId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: settingsQueryKeys.org.userProfile(
      organizationId ?? '',
      userId ?? ''
    ),
    queryFn: async () =>
      await getUserProfileByIdAction(userId || '', organizationId || ''),
    enabled: !!userId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUserPropertyValues(
  userId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: settingsQueryKeys.org.userProperties(
      organizationId ?? '',
      userId ?? ''
    ),
    queryFn: () =>
      getUserPropertyValuesAction(userId ?? '', organizationId ?? ''),
    enabled: !!userId && !!organizationId,
    staleTime: 30000,
  });
}

export function useManagedOrganizations(userId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.managedOrganizations(userId || ''),
    enabled: !!userId,
    queryFn: async () => {
      const res = await getUserManagedOrganizationsAction();
      return res;
    },
  });
}

export function usePrefetchUserProfiles(
  orgId: string | undefined,
  userIds: string[]
) {
  const queryClient = useQueryClient();
  const stableUserIdsKey = useMemo(
    () => Array.from(new Set(userIds)).sort().join('\u0000'),
    [userIds]
  );
  const stableUserIds = useMemo(
    () => (stableUserIdsKey ? stableUserIdsKey.split('\u0000') : []),
    [stableUserIdsKey]
  );

  useEffect(() => {
    if (!orgId || stableUserIds.length === 0) {
      return;
    }

    void Promise.allSettled(
      stableUserIds.flatMap((userId) => [
        queryClient.prefetchQuery({
          queryKey: settingsQueryKeys.org.userProfile(orgId, userId),
          queryFn: () => getUserProfileByIdAction(userId, orgId),
          staleTime: 30000,
          gcTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: settingsQueryKeys.org.userRoles(orgId, userId),
          queryFn: () => getUserOrgRolesAction(orgId, userId),
          staleTime: 30000,
          gcTime: 5 * 60 * 1000,
        }),
        queryClient.prefetchQuery({
          queryKey: settingsQueryKeys.org.userProperties(orgId, userId),
          queryFn: () => getUserPropertyValuesAction(userId, orgId),
          staleTime: 30000,
          gcTime: 5 * 60 * 1000,
        }),
      ])
    );
  }, [orgId, queryClient, stableUserIds]);
}
