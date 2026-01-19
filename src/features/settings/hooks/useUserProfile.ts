import { useQuery } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import { getUserProfileAction, getSalutationsAction } from '../settings-action';
import { getUserOrganizationByIdAction } from '../organization-action';
import { getAllUserOrgRolesAction } from '../users-action';

export function useUserProfile(userId: string | undefined) {
    return useQuery({
        queryKey: settingsQueryKeys.userSettings(userId || ''),
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

export function useOrganizationById(orgId: string | undefined, options?: { staleTime?: number; gcTime?: number }) {
    return useQuery({
        queryKey: orgId ? settingsQueryKeys.organization(orgId) : ['organization', 'null'],
        enabled: !!orgId,
        queryFn: () => getUserOrganizationByIdAction(orgId || ''),
    });
}

export function useOrganizationUserRoles(orgId: string | undefined, options?: { staleTime?: number; gcTime?: number }) {
    return useQuery({
        queryKey: settingsQueryKeys.userOrganizations(orgId || ''),
        enabled: !!orgId,
        queryFn: () => getAllUserOrgRolesAction(orgId || ''),
    });
}
