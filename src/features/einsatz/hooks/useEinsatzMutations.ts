import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { activityLogQueryKeys } from '@/features/activity_log/queryKeys';

import {
  createEinsatz,
  updateEinsatz,
  updateEinsatzTime,
  updateEinsatzStatus,
  deleteEinsatzById,
  toggleUserAssignmentToEinsatz,
  deleteEinsaetzeByIds,
  type EinsatzConflict,
} from '../dal-einsatz';
import { StatusValuePairs } from '@/components/event-calendar/constants';
import { EinsatzCreate } from '../types';
import { CalendarEvent } from '@/components/event-calendar/types';
import { EinsatzCreateToCalendarEvent } from '@/components/event-calendar/einsatz-service';
import { toast } from 'sonner';
import { useAlertDialog } from '@/hooks/use-alert-dialog';

// Helper function to format conflict messages
function formatConflictMessages(conflicts: EinsatzConflict[]): string {
  return conflicts
    .map(
      (c) =>
        `• ${c.userName}: "${c.conflictingEinsatz.title}" (${new Date(c.conflictingEinsatz.start).toLocaleString('de-AT')} - ${new Date(c.conflictingEinsatz.end).toLocaleString('de-AT')})`
    )
    .join('\n');
}

export function useCreateEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz',
  onConflictCancel?: (eventId: string) => void
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const mutation = useMutation({
    mutationFn: async ({
      event,
      disableTimeConflicts = false,
    }: {
      event: EinsatzCreate;
      disableTimeConflicts?: boolean;
    }) => {
      return createEinsatz({ data: event, disableTimeConflicts });
    },
    onMutate: async ({ event }) => {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${einsatzSingular} konnte nicht erstellt werden: ${errorMessage}`);
    },
    onSuccess: async (data, vars, ctx) => {
      if (data.conflicts && data.conflicts.length > 0) {
        // Roll back optimistic update if there are conflicts
        queryClient.setQueryData(queryKey, ctx?.previous);

        // Show confirmation dialog
        const dialogResult = await showDialog({
          title: 'Warnung: Zeitkonflikte erkannt',
          description:
            'Folgende Personen haben bereits einen Einsatz in diesem Zeitraum:\n\n' +
            formatConflictMessages(data.conflicts) +
            '\n\nMöchten Sie trotzdem fortfahren?',
          confirmText: 'Trotzdem fortfahren',
          cancelText: 'Abbrechen',
          variant: 'destructive',
        });

        if (dialogResult === 'success') {
          // User confirmed, retry with conflicts disabled
          mutation.mutate({ event: vars.event, disableTimeConflicts: true });
        } else {
          // User cancelled, open the event dialog if callback provided
          if (onConflictCancel && data.conflicts.length > 0) {
            // Get the first conflicting einsatz ID
            const conflictingEinsatzId = data.conflicts[0].conflictingEinsatz.id;
            onConflictCancel(conflictingEinsatzId);
          }
        }
      } else if (data.einsatz) {
        toast.success(`${einsatzSingular} '${vars.event.title}' wurde erstellt.`);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...mutation,
    AlertDialogComponent,
    mutate: (event: EinsatzCreate) => mutation.mutate({ event }),
    mutateAsync: (event: EinsatzCreate) => mutation.mutateAsync({ event }),
  };
}

export function useUpdateEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz',
  onConflictCancel?: (eventId: string) => void
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const mutation = useMutation({
    mutationFn: async ({
      event,
      disableTimeConflicts = false,
    }: {
      event: EinsatzCreate | CalendarEvent;
      disableTimeConflicts?: boolean;
    }) => {
      if ('org_id' in event) {
        return updateEinsatz({ data: event, disableTimeConflicts });
      } else {
        return updateEinsatzTime({
          id: event.id,
          start: event.start,
          end: event.end,
          disableTimeConflicts,
        });
      }
    },
    onMutate: async ({ event: updatedEvent }) => {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht aktualisiert werden: ${errorMessage}`
      );
    },
    onSuccess: async (data, vars, ctx) => {
      const einsatz = 'einsatz' in data ? data.einsatz : data;
      const conflicts = 'conflicts' in data ? data.conflicts : [];
      const einsatzId = einsatz && 'id' in einsatz ? einsatz.id : undefined;

      if (conflicts && conflicts.length > 0) {
        // Roll back optimistic update if there are conflicts
        queryClient.setQueryData(queryKey, ctx?.previous);

        // Show confirmation dialog
        const dialogResult = await showDialog({
          title: 'Warnung: Zeitkonflikte erkannt',
          description:
            'Folgende Personen haben bereits einen Einsatz in diesem Zeitraum:\n\n' +
            formatConflictMessages(conflicts) +
            '\n\nMöchten Sie trotzdem fortfahren?',
          confirmText: 'Trotzdem fortfahren',
          cancelText: 'Abbrechen',
          variant: 'destructive',
        });

        if (dialogResult === 'success') {
          // User confirmed, retry with conflicts disabled
          mutation.mutate({ event: vars.event, disableTimeConflicts: true });
        } else {
          // User cancelled, open the event dialog if callback provided
          if (onConflictCancel && conflicts.length > 0) {
            // Get the first conflicting einsatz ID
            const conflictingEinsatzId = conflicts[0].conflictingEinsatz.id;
            onConflictCancel(conflictingEinsatzId);
          }
        }
      } else if (einsatz) {
        const title = 'title' in vars.event ? vars.event.title : einsatzSingular;
        toast.success(`${einsatzSingular} '${title}' wurde aktualisiert.`);
      }

      // Only invalidate queries if the update was successful
      if (einsatzId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.allLists(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.detailedEinsatz(einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: activityLogQueryKeys.allEinsatz(einsatzId),
        });
      }
    },
  });

  return {
    ...mutation,
    AlertDialogComponent,
    mutate: (event: EinsatzCreate | CalendarEvent) => mutation.mutate({ event }),
    mutateAsync: (event: EinsatzCreate | CalendarEvent) =>
      mutation.mutateAsync({ event }),
  };
}

/** Minimal status shape for optimistic "bestätigt" display (verwalter_text/helper_text for colors). */
const OPTIMISTIC_BESTAETIGT_STATUS = {
  id: StatusValuePairs.vergeben,
  verwalter_text: 'bestätigt',
  helper_text: 'vergeben',
  verwalter_color: 'green',
  helper_color: 'red',
} as const;

export function useConfirmEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz'
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.einsaetze(activeOrgId ?? '');

  return useMutation({
    mutationFn: async (eventId: string) => {
      return updateEinsatzStatus(
        eventId,
        StatusValuePairs.vergeben_bestaetigt
      );
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<CalendarEvent[]>(queryKey) ?? [];

      const updated = previous.map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          status: { ...(event.status ?? {}), ...OPTIMISTIC_BESTAETIGT_STATUS },
        };
      });

      queryClient.setQueryData<CalendarEvent[]>(queryKey, updated);

      return { previous };
    },
    onError: (error, _eventId, ctx) => {
      if (ctx?.previous != null) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht bestätigt werden: ${errorMessage}`
      );
    },
    onSuccess: (data) => {
      toast.success(`${einsatzSingular} '${data.title}' wurde bestätigt.`);
    },
    onSettled: (_data, _error, eventId) => {
      queryClient.invalidateQueries({ queryKey });
      if (eventId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.detailedEinsatz(eventId),
        });
        queryClient.invalidateQueries({
          queryKey: activityLogQueryKeys.allEinsatz(eventId),
        });
      }
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
    onError: (error, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${einsatzSingular} konnte nicht aktualisiert werden: ${errorMessage}`);
    },
    onSuccess: (data) => {
      if (!Object.hasOwn(data, 'deleted'))
        toast.success(
          `Sie haben sich erfolgreich bei '${data.title}' eingetragen`
        );
      else
        toast.success(`Sie haben sich erfolgreich von ${data.title} ausgetragen`);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${einsatzSingular} konnte nicht gelöscht werden: ${errorMessage}`);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${einsatzSingular} konnte nicht gelöscht werden: ${errorMessage}`);
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
