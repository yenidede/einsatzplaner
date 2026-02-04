import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addMonths, subMonths } from 'date-fns';
import { format } from 'date-fns';
import { queryKeys } from '../queryKeys';
import { activityLogQueryKeys } from '@/features/activity_log/queryKeys';

/** Returns the 3 monthKeys that overlap the 3-month window centered on the given date. */
function getMonthKeysForDate(date: Date): string[] {
  const d = new Date(date);
  return [
    format(subMonths(d, 1), 'yyyy-MM'),
    format(d, 'yyyy-MM'),
    format(addMonths(d, 1), 'yyyy-MM'),
  ];
}

function invalidateCalendarMonthsForDate(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  date: Date
) {
  const monthKeys = getMonthKeysForDate(date);
  monthKeys.forEach((monthKey) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.einsaetzeForCalendar(orgId, monthKey),
    });
  });
}

function invalidateAllCalendarMonthsForOrg(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });
}

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
  const calendarPrefixKey = queryKeys.einsaetzeForCalendarPrefix(activeOrgId ?? '');
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
      await queryClient.cancelQueries({ queryKey: calendarPrefixKey });
      return {};
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${einsatzSingular} konnte nicht erstellt werden: ${errorMessage}`);
    },
    onSuccess: async (data, vars, _ctx) => {
      if (data.conflicts && data.conflicts.length > 0) {
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
    onSettled: (data, _error, vars) => {
      const date =
        data?.einsatz && typeof data.einsatz.start !== 'undefined'
          ? new Date(data.einsatz.start)
          : vars?.event?.start;
      if (activeOrgId && date) {
        invalidateCalendarMonthsForDate(queryClient, activeOrgId, date);
      } else if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
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
  const calendarPrefixKey = queryKeys.einsaetzeForCalendarPrefix(activeOrgId ?? '');
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: calendarPrefixKey });
      return {};
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht aktualisiert werden: ${errorMessage}`
      );
    },
    onSuccess: async (data, vars) => {
      const einsatz = 'einsatz' in data ? data.einsatz : data;
      const conflicts = 'conflicts' in data ? data.conflicts : [];
      const einsatzId = einsatz && 'id' in einsatz ? einsatz.id : undefined;

      if (conflicts && conflicts.length > 0) {
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

      if (einsatzId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.detailedEinsatz(einsatzId),
        });
        queryClient.invalidateQueries({
          queryKey: activityLogQueryKeys.allEinsatz(einsatzId),
        });
      }
    },
    onSettled: (data, _error, vars) => {
      const date =
        data && 'einsatz' in data && data.einsatz && typeof data.einsatz.start !== 'undefined'
          ? new Date(data.einsatz.start)
          : data && !('conflicts' in data) && data && typeof (data as { start?: Date }).start !== 'undefined'
            ? new Date((data as { start: Date }).start)
            : vars?.event && ('start' in vars.event && typeof vars.event.start !== 'undefined')
              ? new Date(vars.event.start)
              : null;
      if (activeOrgId && date) {
        invalidateCalendarMonthsForDate(queryClient, activeOrgId, date);
      } else if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
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

  return useMutation({
    mutationFn: async (eventId: string) => {
      return updateEinsatzStatus(
        eventId,
        StatusValuePairs.vergeben_bestaetigt
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId ?? ''),
      });
      return {};
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht bestätigt werden: ${errorMessage}`
      );
    },
    onSuccess: (data) => {
      toast.success(`${einsatzSingular} '${data.title}' wurde bestätigt.`);
    },
    onSettled: (data, _error, eventId) => {
      if (eventId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.detailedEinsatz(eventId),
        });
        queryClient.invalidateQueries({
          queryKey: activityLogQueryKeys.allEinsatz(eventId),
        });
      }
      if (activeOrgId && data && typeof (data as { start?: Date }).start !== 'undefined') {
        invalidateCalendarMonthsForDate(
          queryClient,
          activeOrgId,
          new Date((data as { start: Date }).start)
        );
      } else if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
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

  return useMutation({
    mutationFn: async (eventId: string) => {
      return await toggleUserAssignmentToEinsatz(eventId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId ?? ''),
      });
      return {};
    },
    onError: (error) => {
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
      const start =
        data && typeof (data as { start?: Date }).start !== 'undefined'
          ? (data as { start: Date }).start
          : null;
      if (activeOrgId && start) {
        invalidateCalendarMonthsForDate(
          queryClient,
          activeOrgId,
          new Date(start)
        );
      } else if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
    },
  });
}

export function useDeleteEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
    }: {
      eventId: string;
      eventTitle?: string;
    }) => {
      return deleteEinsatzById(eventId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId ?? ''),
      });
      return {};
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${einsatzSingular} konnte nicht gelöscht werden: ${errorMessage}`);
    },
    onSuccess: (_data, vars) => {
      const title = vars.eventTitle || 'Unbenannt';
      toast.success(`${einsatzSingular} '${title}' wurde gelöscht.`);
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.eventId) {
        queryClient.removeQueries({
          queryKey: queryKeys.detailedEinsatz(variables.eventId),
        });
      }
      if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
    },
  });
}

export function useDeleteMultipleEinsaetze(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz',
  einsatzPlural: string = 'Einsätze'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventIds }: { eventIds: string[] }) => {
      return deleteEinsaetzeByIds(eventIds);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId ?? ''),
      });
      return {};
    },
    onError: (error) => {
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
      if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
    },
  });
}
