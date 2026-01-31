'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSubscriptionAction,
  rotateSubscriptionAction,
  deactivateSubscriptionAction,
  activateSubscriptionAction,
} from '../actions';
import { useSession } from 'next-auth/react';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';

export type CalendarSubscription = {
  id: string;
  name: string;
  is_active: boolean;
  token: string;
  webcalUrl: string;
  httpUrl: string;
  last_accessed: string | null;
};

const key = (userId?: string, orgId?: string) =>
  settingsQueryKeys.calendarSubscription(userId, orgId);

export function useCalendarSubscription(orgId: string) {
  const queryClient = useQueryClient();
  const session = useSession();
  const userId = session.data?.user?.id;
  const queryKey = key(userId, orgId);

  const query = useQuery({
    queryKey,
    queryFn: () => getSubscriptionAction(orgId),
    enabled: !!orgId && !!userId,
    staleTime: 60000,
    retry: 3,
  });

  const rotate = useMutation({
    mutationFn: (id: string) => rotateSubscriptionAction(id),
    onSuccess: (data) => {
      queryClient.setQueryData<CalendarSubscription>(queryKey, (prev) =>
        prev
          ? {
            ...prev,
            token: data.token,
            webcalUrl: data.webcalUrl,
            httpUrl: data.httpUrl,
          }
          : prev
      );
      toast.success('Neuer Kalender-Link wurde generiert');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Generieren des neuen Links'
      );
    },
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateSubscriptionAction(id),
    onSuccess: () => {
      queryClient.setQueryData<CalendarSubscription>(queryKey, (prev) =>
        prev ? { ...prev, is_active: false } : prev
      );
      toast.success('Kalender-Integration wurde deaktiviert');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Deaktivieren der Kalender-Integration'
      );
    },
  });

  const activate = useMutation({
    mutationFn: (id: string) => activateSubscriptionAction(id),
    onSuccess: () => {
      queryClient.setQueryData<CalendarSubscription>(queryKey, (prev) =>
        prev ? { ...prev, is_active: true } : prev
      );
      toast.success('Kalender-Integration wurde aktiviert');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Aktivieren der Kalender-Integration'
      );
    },
  });

  return { query, rotate, deactivate, activate };
}
