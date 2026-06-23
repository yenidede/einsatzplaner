'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getMyOrganizationNotificationPreferencesAction,
  getOrganizationNotificationDefaultsAction,
  updateMyNotificationDetailsAction,
  updateMyNotificationPrimaryAction,
  updateOrganizationNotificationDefaultsAction,
} from './notification-preferences-actions';
import { notificationPreferenceQueryKeys } from './queryKeys';
import type {
  DigestInterval,
  DigestTime,
  DeliveryMode,
  MinimumPriority,
  UpdateMyNotificationPrimaryInput,
  UpdateOrganizationNotificationDefaultsInput,
} from './types';

export function useMyOrganizationNotificationPreferences(
  userId: string | undefined
) {
  return useQuery({
    queryKey: notificationPreferenceQueryKeys.user.cards(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const result = await getMyOrganizationNotificationPreferencesAction();
      if (!result) {
        throw new Error('Benachrichtigungseinstellungen konnten nicht geladen werden.');
      }

      return result;
    },
  });
}

export function useOrganizationNotificationDefaults(
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: notificationPreferenceQueryKeys.org.defaults(organizationId ?? ''),
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organisation ist erforderlich.');
      }

      const result = await getOrganizationNotificationDefaultsAction(organizationId);
      if (!result) {
        throw new Error('Organisationseinstellungen konnten nicht geladen werden.');
      }

      return result;
    },
  });
}

export function useUpdateMyNotificationPrimary(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMyNotificationPrimaryInput) => {
      const result = await updateMyNotificationPrimaryAction(input);
      if (!result) {
        throw new Error('Einstellung konnte nicht gespeichert werden.');
      }

      return result;
    },
    onSuccess: () => {
      if (!userId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: notificationPreferenceQueryKeys.user.cards(userId),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Einstellung konnte nicht gespeichert werden.'
      );
    },
  });
}

export function useUpdateMyNotificationDetails(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      organizationId: string;
      deliveryMode: DeliveryMode;
      minimumPriority: MinimumPriority;
      urgentDelivery: 'immediate' | 'digest';
      importantDelivery: 'immediate' | 'digest';
      generalDelivery: 'digest' | 'off';
      digestInterval: DigestInterval;
      digestTime: DigestTime;
      digestSecondTime?: DigestTime;
    }) => {
      const result = await updateMyNotificationDetailsAction(input);
      if (!result) {
        throw new Error('Details konnten nicht gespeichert werden.');
      }

      return result;
    },
    onSuccess: () => {
      if (!userId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: notificationPreferenceQueryKeys.user.cards(userId),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Details konnten nicht gespeichert werden.'
      );
    },
  });
}

export function useUpdateOrganizationNotificationDefaults(
  organizationId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<UpdateOrganizationNotificationDefaultsInput, 'organizationId'>
    ) => {
      if (!organizationId) {
        throw new Error('Organisation ist erforderlich.');
      }

      const result = await updateOrganizationNotificationDefaultsAction({
        organizationId,
        ...input,
      });

      if (!result) {
        throw new Error('Organisationseinstellungen konnten nicht gespeichert werden.');
      }

      return result;
    },
    onSuccess: () => {
      if (!organizationId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: notificationPreferenceQueryKeys.org.defaults(organizationId),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Organisationseinstellungen konnten nicht gespeichert werden.'
      );
    },
  });
}
