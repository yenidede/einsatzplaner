'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSubscriptionAction,
  rotateSubscriptionAction,
  deactivateSubscriptionAction,
  activateSubscriptionAction,
} from '../actions';

export type CalendarSubscription = {
  id: string;
  name: string;
  is_active: boolean;
  token: string;
  webcalUrl: string;
  httpUrl: string;
  last_accessed: string | null;
};

const key = (orgId: string) => ['calendar-subscription', orgId];

export function useCalendarSubscription(orgId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: key(orgId),
    queryFn: () => getSubscriptionAction(orgId),
    enabled: !!orgId,
    staleTime: 60000,
    retry: 1,
  });

  const rotate = useMutation({
    mutationFn: (id: string) => rotateSubscriptionAction(id),
    onSuccess: (data) => {
      queryClient.setQueryData<CalendarSubscription>(key(orgId), (prev) =>
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
      queryClient.setQueryData<CalendarSubscription>(key(orgId), (prev) =>
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
      queryClient.setQueryData<CalendarSubscription>(key(orgId), (prev) =>
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
