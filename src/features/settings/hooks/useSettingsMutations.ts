import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import {
    updateUserProfileAction,
    removeUserFromOrganizationAction,
    UserUpdateData,
} from '../settings-action';
import { updateOrganizationAction } from '../organization-action';
import { toast } from 'sonner';

export function useUpdateUserProfile(userId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: settingsQueryKeys.userSettings(userId || ''),
        mutationFn: async (newSettings: UserUpdateData) => {
            const res = await updateUserProfileAction(newSettings);
            if (!res) throw new Error('Fehler beim Speichern');
            return res;
        },
        onMutate: () => {
            return { toastId: toast.loading('Speichert...') };
        },
        onSuccess: (data, variables, context) => {
            toast.success('Einstellungen erfolgreich gespeichert!', {
                id: context.toastId,
            });
            queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.userSettings(userId || ''),
            });
        },
        onError: (error, variables, context) => {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Fehler beim Speichern der Einstellungen',
                { id: context?.toastId }
            );
        },
    });
}

export function useLeaveOrganization(userId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            organizationId,
        }: {
            userId: string;
            organizationId: string;
        }) => {
            const res = await removeUserFromOrganizationAction(
                userId,
                organizationId
            );
            if (!res) throw new Error('Failed to leave organization');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.userSettings(userId || ''),
            });
        },
    });
}

export function useUpdateOrganization(orgId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            name: string;
            description: string;
            email?: string;
            phone?: string;
            helper_name_singular?: string;
            helper_name_plural?: string;
            einsatz_name_singular?: string;
            einsatz_name_plural?: string;
            max_participants_per_helper?: number;
            logoFile?: File | null;
            website?: string;
            vat?: string;
            zvr?: string;
            authority?: string;
        }) => {
            const updateData: any = {
                id: orgId,
                name: data.name,
                description: data.description,
                email: data.email,
                max_participants_per_helper: data.max_participants_per_helper,
                phone: data.phone,
                helper_name_singular: data.helper_name_singular,
                helper_name_plural: data.helper_name_plural,
                einsatz_name_singular: data.einsatz_name_singular,
                einsatz_name_plural: data.einsatz_name_plural,
            };

            const res = await updateOrganizationAction(updateData);
            if (!res) throw new Error('Fehler beim Speichern');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.organization(orgId || ''),
            });
        },
    });
}
