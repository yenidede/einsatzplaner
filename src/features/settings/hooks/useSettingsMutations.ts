import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsQueryKeys } from '../queryKeys/queryKey';
import {
  updateUserProfileAction,
  removeUserFromOrganizationAction,
  UserUpdateData,
} from '../settings-action';
import {
  OrganizationUpdateData,
  updateOrganizationAction,
} from '../organization-action';
import { toast } from 'sonner';
import { queryKeys } from '@/features/organization/queryKeys';

export function useUpdateUserProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: settingsQueryKeys.user.settings(userId || ''),
    mutationFn: async (newSettings: UserUpdateData) => {
      const res = await updateUserProfileAction(newSettings);
      if (!res) throw new Error('Fehler beim Speichern');
      return res;
    },
    onMutate: () => {
      return { toastId: toast.loading('Speichert...') };
    },
    onSuccess: (_data, _variables, context) => {
      toast.success('Einstellungen erfolgreich gespeichert!', {
        id: context.toastId,
      });
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.user.settings(userId),
      });
    },
    onError: (error, _vars, context) => {
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
      if (!res) throw new Error('Fehler beim Verlassen der Organisation');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.user.settings(userId || ''),
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
      allow_self_sign_out?: boolean;
      default_starttime?: string;
      default_endtime?: string;
    }) => {
      if (!orgId) {
        throw new Error('Organisation ID ist erforderlich');
      }

      const updateData: OrganizationUpdateData = {
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
        allow_self_sign_out: data.allow_self_sign_out,
        default_starttime: data.default_starttime,
        default_endtime: data.default_endtime,
      };

      const resPromise = updateOrganizationAction(updateData);
      toast.promise(resPromise, {
        loading: 'Speichert Organisationsdaten ...',
        success: 'Organisationsdaten erfolgreich gespeichert!',
        error: 'Fehler beim Speichern der Organisationseinstellungen',
      });

      const res = await resPromise;
      if (!res)
        throw new Error('Fehler beim Speichern der Organisationseinstellungen');
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.org.all(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.all,
        predicate: (query) => query.queryHash.includes(data.id),
      });
    },
  });
}
