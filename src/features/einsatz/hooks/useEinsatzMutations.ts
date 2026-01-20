import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { activityLogQueryKeys } from '@/features/activity_log/queryKeys';

import {
  createEinsatz,
  updateEinsatz,
  updateEinsatzTime,
  deleteEinsatzById,
  toggleUserAssignmentToEinsatz,
  deleteEinsaetzeByIds,
} from '../dal-einsatz';
import { EinsatzCreate } from '../types';
import { CalendarEvent } from '@/components/event-calendar/types';
import { EinsatzCreateToCalendarEvent } from '@/components/event-calendar/einsatz-service';
import { toast } from 'sonner';

export function useCreateEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz'
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');

  return useMutation({
    mutationFn: async (event: EinsatzCreate) => {
      return createEinsatz({ data: event });
    },
    onMutate: async (event) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<CalendarEvent[]>(queryKey);

      // if we create a new einsatz, assign a temporary id. After the server response, all data will be refetched.
      const id = event.id ?? 'temp-' + crypto.randomUUID();
      const optimisticVars: EinsatzCreate = { ...event, id };
      const calendarEvent = await EinsatzCreateToCalendarEvent(optimisticVars);

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) => [
        ...old,
        calendarEvent,
      ]);

      return { previous };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatzSingular} konnte nicht erstellt werden: ${error}`);
    },
    onSuccess: (_data, vars) => {
      toast.success(`${einsatzSingular} '${vars.title}' wurde erstellt.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz'
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');

  return useMutation({
    mutationFn: async (event: EinsatzCreate | CalendarEvent) => {
      if ('org_id' in event) {
        return updateEinsatz({ data: event });
      } else {
        return updateEinsatzTime({
          id: event.id,
          start: event.start,
          end: event.end,
        });
      }
    },
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];

      let calendarEvent: CalendarEvent | null = null;
      if ('org_id' in updatedEvent) {
        calendarEvent = await EinsatzCreateToCalendarEvent(updatedEvent);
      } else {
        calendarEvent = updatedEvent;
      }

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.map((e) => (e.id === calendarEvent.id ? calendarEvent! : e))
      );

      return { previous };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(
        `${einsatzSingular} konnte nicht aktualisiert werden: ${error}`
      );
    },
    onSuccess: (data, vars) => {
      toast.success(`${einsatzSingular} '${vars.title}' wurde aktualisiert.`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.allLists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.detailedEinsatz(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: activityLogQueryKeys.allEinsatz(data.id),
      })
    },
  });
}

export function useToggleUserAssignment(
  activeOrgId: string | undefined,
  userId: string | undefined,
  einsatzSingular: string = 'Einsatz'
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');

  return useMutation({
    mutationFn: async (eventId: string) => {
      return await toggleUserAssignmentToEinsatz(eventId);
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) ?? [];

      if (!userId) return { previous };

      const updated = previous.map((event) => {
        if (event.id !== eventId) return event;

        const isAssigned = event.assignedUsers.includes(userId);
        const newAssignedUsers = isAssigned
          ? event.assignedUsers.filter((id) => id !== userId)
          : [...event.assignedUsers, userId];

        return { ...event, assignedUsers: newAssignedUsers };
      });

      queryClient.setQueryData<CalendarEvent[]>(queryKey, updated);

      return { previous };
    },
    onError: (_error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatzSingular} konnte nicht aktualisiert werden`);
    },
    onSuccess: (data) => {
      if (!Object.hasOwn(data, 'deleted'))
        toast.success(
          `Du hast dich erfolgreich bei '${data.title}' eingetragen`
        );
      else
        toast.success(`Du hast dich erfolgreich von ${data.title} ausgetragen`);
    },
    onSettled: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.detailedEinsatz(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.einsaetze(activeOrgId ?? ''),
      });
    },
  });
}

export function useDeleteEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz'
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');

  return useMutation({
    mutationFn: async ({
      eventId,
    }: {
      eventId: string;
      eventTitle?: string;
    }) => {
      return deleteEinsatzById(eventId);
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];
      const toDelete = previous.find((e) => e.id === eventId);

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.filter((e) => e.id !== eventId)
      );

      return { previous, toDelete };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatzSingular} konnte nicht gelöscht werden: ${error}`);
    },
    onSuccess: (_data, vars, ctx) => {
      const title = ctx?.toDelete?.title || vars.eventTitle || 'Unbenannt';
      toast.success(`${einsatzSingular} '${title}' wurde gelöscht.`);
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.eventId) {
        queryClient.removeQueries({
          queryKey: queryKeys.detailedEinsatz(variables.eventId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.einsaetze(activeOrgId ?? ''),
      });
    },
  });
}

export function useDeleteMultipleEinsaetze(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz',
  einsatzPlural: string = 'Einsätze'
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');

  return useMutation({
    mutationFn: async ({ eventIds }: { eventIds: string[] }) => {
      return deleteEinsaetzeByIds(eventIds);
    },
    onMutate: async ({ eventIds }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) || [];
      const toDelete = previous.filter((e) => eventIds.includes(e.id));

      queryClient.setQueryData<CalendarEvent[]>(queryKey, (old = []) =>
        old.filter((e) => !eventIds.includes(e.id))
      );

      return { previous, toDelete };
    },
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      toast.error(`${einsatzSingular} konnte nicht gelöscht werden: ${error}`);
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.eventIds.length + ' ' + einsatzPlural + ' wurden gelöscht.'
      );
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.eventIds) {
        variables.eventIds.forEach((id) => {
          queryClient.removeQueries({
            queryKey: queryKeys.detailedEinsatz(id),
          });
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.einsaetze(activeOrgId ?? ''),
      });
    },
  });
}
