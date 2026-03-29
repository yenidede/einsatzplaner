import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { activityLogQueryKeys } from '../queryKeys';
import {
  getActivitiesForEinsatzAction,
  getActivityLogsAction,
  getChangeTypesAction,
  getNotificationReadStateAction,
  markNotificationsAsReadAction,
} from '../activity_log-actions';
import type { ActivityLogFilters, NotificationReadState } from '../types';

export function useActivityLogs(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: activityLogQueryKeys.list(params),
    queryFn: async () => {
      const result = await getActivityLogsAction(params);
      return result.data?.activities || [];
    },
    staleTime: 1 * 60 * 1000, // check for new notifications every minute
  });
}

export function useActivityLogsFiltered(
  filters: ActivityLogFilters,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: activityLogQueryKeys.listFiltered(filters),
    queryFn: async () => {
      const result = await getActivityLogsAction(filters);
      return {
        activities: result.data?.activities || [],
        total: result.data?.total ?? 0,
        hasMore: result.data?.hasMore ?? false,
      };
    },
    enabled,
    staleTime: 1 * 60 * 1000,
  });
}

export function useChangeTypes(enabled: boolean = true) {
  return useQuery({
    queryKey: activityLogQueryKeys.changeTypes,
    queryFn: async () => {
      const result = await getChangeTypesAction();
      return result.data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotificationReadState(enabled: boolean = true) {
  return useQuery({
    queryKey: activityLogQueryKeys.notificationReadState,
    queryFn: async () => {
      const result = await getNotificationReadStateAction();

      if (!result.success || !result.data) {
        throw new Error(
          result.error ?? 'Benachrichtigungsstatus konnte nicht geladen werden.'
        );
      }

      return result.data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (readAt: Date) => {
      const result = await markNotificationsAsReadAction(readAt);

      if (!result.success || !result.data) {
        throw new Error(
          result.error ??
            'Benachrichtigungsstatus konnte nicht gespeichert werden.'
        );
      }

      return result.data;
    },
    onMutate: async (readAt) => {
      await queryClient.cancelQueries({
        queryKey: activityLogQueryKeys.notificationReadState,
      });

      const previousState =
        queryClient.getQueryData<NotificationReadState>(
          activityLogQueryKeys.notificationReadState
        );

      queryClient.setQueryData<NotificationReadState>(
        activityLogQueryKeys.notificationReadState,
        {
          lastReadNotifications: readAt,
        }
      );

      return { previousState };
    },
    onError: (_error, _readAt, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(
          activityLogQueryKeys.notificationReadState,
          context.previousState
        );
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(activityLogQueryKeys.notificationReadState, data);
    },
  });
}

export function useEinsatzActivityLogs(
  einsatzId: string | null | undefined,
  limit: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: activityLogQueryKeys.einsatz(einsatzId ?? '', limit),
    queryFn: () => getActivitiesForEinsatzAction(einsatzId ?? '', limit),
    enabled: !!einsatzId && enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
