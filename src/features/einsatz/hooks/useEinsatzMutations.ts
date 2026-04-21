import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  format,
  startOfDay,
  subMonths,
} from 'date-fns';
import { queryKeys } from '../queryKeys';
import { activityLogQueryKeys } from '@/features/activity_log/queryKeys';
import type { CalendarRangeData } from '@/components/event-calendar/utils';
import { parseCalendarDateTimeString } from '@/features/einsatz/datetime';
import type { EinsatzCreate } from '@/features/einsatz/types';

/** If isOverlap is true, returns the 3 monthKeys that overlap the 3-month window centered on the given date. Otherwise, returns the 1 monthKey for the given date. */
export function getMonthKeysForDate(date: Date, isOverlap = true): string[] {
  const d = new Date(date);
  if (isOverlap) {
    return [
      format(subMonths(d, 1), 'yyyy-MM'),
      format(d, 'yyyy-MM'),
      format(addMonths(d, 1), 'yyyy-MM'),
    ];
  } else {
    return [format(d, 'yyyy-MM')];
  }
}

/** Object with start and optional end (Date or ISO string). Used for multi-day event invalidation. */
type WithStartEnd = { start: Date | string; end?: Date | string };

function toMutationDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }

  const parsedWallClock = parseCalendarDateTimeString(value);
  if (parsedWallClock) {
    return parsedWallClock;
  }

  return new Date(value);
}

type SavingTrackedEinsatzCreate = EinsatzCreate & {
  __savingEventId?: string;
};

function useSavingEventIds() {
  const [savingEventCounts, setSavingEventCounts] = useState<Record<string, number>>(
    {}
  );

  const addSavingEventId = useCallback((eventId: string) => {
    setSavingEventCounts((current) => ({
      ...current,
      [eventId]: (current[eventId] ?? 0) + 1,
    }));
  }, []);

  const removeSavingEventId = useCallback((eventId: string) => {
    setSavingEventCounts((current) => {
      const nextCount = (current[eventId] ?? 0) - 1;
      if (nextCount > 0) {
        return { ...current, [eventId]: nextCount };
      }

      if (!(eventId in current)) {
        return current;
      }

      const { [eventId]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const savingEventIds = useMemo(() => Object.keys(savingEventCounts), [savingEventCounts]);

  return {
    addSavingEventId,
    removeSavingEventId,
    savingEventIds,
  };
}

/** Returns one Date per calendar day from start through end (inclusive). If end is missing or before start, returns [startOfDay(start)]. */
function getDatesSpanningEvent(event: WithStartEnd): Date[] {
  const start = startOfDay(toMutationDate(event.start));
  const endRaw = event.end != null ? toMutationDate(event.end) : start;
  const end = startOfDay(endRaw);
  if (end < start) return [start];
  return eachDayOfInterval({ start, end });
}

function invalidateCalendarMonthsForDate(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  dates: Date[]
) {
  if (dates.length === 0) return;
  const monthKeys = Array.from(
    new Set(dates.flatMap((date) => getMonthKeysForDate(date, false)))
  );
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

function invalidateAgendaForOrg(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.einsaetzeForAgenda(orgId),
  });
}

function invalidateCalendarSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: CalendarCacheSnapshot
) {
  snapshot.forEach(([key]) => {
    queryClient.invalidateQueries({
      queryKey: key,
    });
  });
}

function invalidateActivityLogs(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({
    queryKey: activityLogQueryKeys.all,
  });
}

async function cancelEinsatzQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  activeOrgId: string | undefined,
  einsatzId?: string
) {
  const queriesToCancel = [
    queryClient.cancelQueries({
      queryKey: queryKeys.einsaetzeListPrefix(),
    }),
  ];

  if (activeOrgId) {
    queriesToCancel.push(
      queryClient.cancelQueries({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      })
    );
  }

  if (einsatzId) {
    queriesToCancel.push(
      queryClient.cancelQueries({
        queryKey: queryKeys.detailedEinsatz(einsatzId),
      })
    );
  }

  await Promise.all(queriesToCancel);
}

async function cancelMultipleEinsatzQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  activeOrgId: string | undefined,
  einsatzIds: string[]
) {
  await Promise.all([
    cancelEinsatzQueries(queryClient, activeOrgId),
    ...einsatzIds.map((einsatzId) =>
      queryClient.cancelQueries({
        queryKey: queryKeys.detailedEinsatz(einsatzId),
      })
    ),
  ]);
}

function invalidateEinsatzQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  einsatzId?: string
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.einsaetzeListPrefix(),
  });

  if (einsatzId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.detailedEinsatz(einsatzId),
    });
  }
}

import {
  createEinsatz,
  updateEinsatz,
  updateEinsatzTime,
  updateEinsatzStatus,
  deleteEinsatzById,
  toggleUserAssignmentToEinsatz,
  type UserAssignmentIntent,
  deleteEinsaetzeByIds,
  type EinsatzConflict,
} from '../dal-einsatz';
import { StatusValuePairs } from '@/components/event-calendar/constants';
import { CalendarEvent } from '@/components/event-calendar/types';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

/** Snapshot of calendar cache entries for optimistic rollback. */
type CalendarCacheSnapshot = Array<[QueryKey, CalendarRangeData | undefined]>;

function rollbackCalendarCache(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: CalendarCacheSnapshot
) {
  snapshot.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
}

/** Type guard: object has a defined start (Date or string). Used for update response that may be raw einsatz. */
function hasDefinedStart(obj: unknown): obj is { start: Date | string } {
  if (obj === null || typeof obj !== 'object') return false;
  if (!('start' in obj)) return false;
  const start = (obj as Record<string, unknown>).start;
  return typeof start === 'string' || start instanceof Date;
}

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
  const { showDestructive } = useConfirmDialog();
  const { addSavingEventId, removeSavingEventId, savingEventIds } =
    useSavingEventIds();

  const mutation = useMutation({
    mutationFn: async ({
      event,
      disableTimeConflicts = false,
    }: {
      event: SavingTrackedEinsatzCreate;
      disableTimeConflicts?: boolean;
    }) => {
      return createEinsatz({ data: event, disableTimeConflicts });
    },
    onMutate: async ({ event }) => {
      await cancelEinsatzQueries(queryClient, activeOrgId);
      if (!activeOrgId) return {};
      const savingEventId =
        event.__savingEventId ?? event.id ?? `temp-${crypto.randomUUID()}`;
      event.__savingEventId = savingEventId;
      addSavingEventId(savingEventId);
      const dates = getDatesSpanningEvent({
        start: event.start,
        end: event.end != null ? event.end : undefined,
      });
      const monthKeys = Array.from(
        new Set(dates.flatMap((d) => getMonthKeysForDate(d, false)))
      );
      const optimisticEvent: CalendarEvent = {
        id: savingEventId,
        title: event.title,
        start: toMutationDate(event.start),
        end: toMutationDate(event.end),
        allDay: event.all_day ?? false,
        assignedUsers: event.assignedUsers ?? [],
        helpersNeeded: event.helpers_needed,
      };
      const previousData: CalendarCacheSnapshot = [];
      for (const monthKey of monthKeys) {
        const key = queryKeys.einsaetzeForCalendar(activeOrgId, monthKey);
        const data = queryClient.getQueryData<CalendarRangeData>(key);
        if (data) {
          previousData.push([key, data]);
          queryClient.setQueryData<CalendarRangeData>(key, {
            ...data,
            events: [...data.events, optimisticEvent],
          });
        }
      }
      return { previousData, savingEventId };
    },
    onError: (error, _vars, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht erstellt werden: ${errorMessage}`
      );
    },
    onSuccess: async (data, vars) => {
      if (data.conflicts && data.conflicts.length > 0) {
        // Show confirmation dialog
        const dialogResult = await showDestructive(
          'Warnung: Zeitkonflikte erkannt',
          'Folgende Personen haben bereits einen Einsatz in diesem Zeitraum:\n\n' +
            formatConflictMessages(data.conflicts) +
            '\n\nMöchten Sie trotzdem fortfahren?'
        );

        if (dialogResult === 'success') {
          // User confirmed, retry with conflicts disabled
          mutation.mutate({ event: vars.event, disableTimeConflicts: true });
        } else {
          // User cancelled, open the event dialog if callback provided
          if (onConflictCancel && data.conflicts.length > 0) {
            // Get the first conflicting einsatz ID
            const conflictingEinsatzId =
              data.conflicts[0].conflictingEinsatz.id;
            onConflictCancel(conflictingEinsatzId);
          }
        }
      } else if (data.einsatz) {
        toast.success(
          `${einsatzSingular} '${vars.event.title}' wurde erstellt.`
        );
      }
    },
    onSettled: (data, _error, vars, context) => {
      const event = data?.einsatz ?? vars?.event;
      if (context?.savingEventId) {
        removeSavingEventId(context.savingEventId);
      }
      invalidateEinsatzQueries(queryClient, data?.einsatz?.id);
      if (data?.einsatz?.id) {
        invalidateActivityLogs(queryClient);
      }
      if (activeOrgId && event && hasDefinedStart(event)) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
        const dates = getDatesSpanningEvent({
          start: event.start,
          end: 'end' in event && event.end != null ? event.end : undefined,
        });
        invalidateCalendarMonthsForDate(queryClient, activeOrgId, dates);
      } else if (activeOrgId) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
    },
  });

  return {
    ...mutation,
    mutate: (event: EinsatzCreate) => mutation.mutate({ event }),
    mutateAsync: (event: EinsatzCreate) => mutation.mutateAsync({ event }),
    savingEventIds,
  };
}

export function useUpdateEinsatz(
  activeOrgId: string | undefined,
  einsatzSingular: string = 'Einsatz',
  onConflictCancel?: (eventId: string) => void
) {
  const queryClient = useQueryClient();
  const { showDestructive } = useConfirmDialog();
  const { addSavingEventId, removeSavingEventId, savingEventIds } =
    useSavingEventIds();

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
    onMutate: async ({ event }) => {
      await cancelEinsatzQueries(queryClient, activeOrgId, event.id);
      if (!activeOrgId) return {};
      const eventId = event.id;
      if (!eventId) return {};
      addSavingEventId(eventId);
      const start =
        'start' in event && event.start
          ? toMutationDate(event.start)
          : null;
      const previousData: CalendarCacheSnapshot = [];
      const queries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });
      for (const [key, data] of queries) {
        if (!data) continue;
        const idx = data.events.findIndex((e) => e.id === eventId);
        if (idx === -1) continue;
        previousData.push([key, data]);
        const prev = data.events[idx];
        const updated: CalendarEvent = {
          ...prev,
          ...(start && { start }),
          ...('end' in event &&
            event.end !== undefined && {
              end: toMutationDate(event.end),
            }),
        };
        if ('title' in event && event.title !== undefined)
          updated.title = event.title;
        if ('all_day' in event && event.all_day !== undefined)
          updated.allDay = event.all_day;
        if ('assignedUsers' in event && event.assignedUsers !== undefined)
          updated.assignedUsers = event.assignedUsers;
        if ('helpersNeeded' in event && event.helpersNeeded !== undefined)
          updated.helpersNeeded = event.helpersNeeded;
        const newEvents = [...data.events];
        newEvents[idx] = updated;
        queryClient.setQueryData<CalendarRangeData>(key, {
          ...data,
          events: newEvents,
        });
      }
      return { previousData, savingEventId: eventId };
    },
    onError: (error, _vars, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
        const dialogResult = await showDestructive(
          'Warnung: Zeitkonflikte erkannt',
          'Folgende Personen haben bereits einen Einsatz in diesem Zeitraum:\n\n' +
            formatConflictMessages(conflicts) +
            '\n\nMöchten Sie trotzdem fortfahren?'
        );

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
        const title =
          'title' in vars.event ? vars.event.title : einsatzSingular;
        toast.success(`${einsatzSingular} '${title}' wurde aktualisiert.`);
      }

      if (einsatzId) {
        invalidateEinsatzQueries(queryClient, einsatzId);
        invalidateActivityLogs(queryClient);
      }
    },
    onSettled: (data, _error, vars, context) => {
      if (context?.savingEventId) {
        removeSavingEventId(context.savingEventId);
      }
      const event =
        data && 'einsatz' in data && data.einsatz
          ? data.einsatz
          : data && hasDefinedStart(data)
            ? data
            : vars?.event && 'start' in vars.event
              ? vars.event
              : null;
      const fallbackEinsatzId = vars?.event?.id;
      if (!data && fallbackEinsatzId) {
        invalidateEinsatzQueries(queryClient, fallbackEinsatzId);
      }
      if (activeOrgId) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
      }
      if (activeOrgId && context?.previousData?.length) {
        invalidateCalendarSnapshot(queryClient, context.previousData);
      } else if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
      if (activeOrgId && event && hasDefinedStart(event)) {
        const dates = getDatesSpanningEvent({
          start: event.start,
          end: 'end' in event && event.end != null ? event.end : undefined,
        });
        invalidateCalendarMonthsForDate(queryClient, activeOrgId, dates);
      }
    },
  });

  return {
    ...mutation,
    mutate: (event: EinsatzCreate | CalendarEvent) =>
      mutation.mutate({ event }),
    mutateAsync: (event: EinsatzCreate | CalendarEvent) =>
      mutation.mutateAsync({ event }),
    savingEventIds,
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
      return updateEinsatzStatus(eventId, StatusValuePairs.vergeben_bestaetigt);
    },
    onMutate: async (eventId) => {
      await cancelEinsatzQueries(queryClient, activeOrgId, eventId);
      if (!activeOrgId) return {};
      const previousData: CalendarCacheSnapshot = [];
      const queries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });
      for (const [key, data] of queries) {
        if (!data) continue;
        const idx = data.events.findIndex((e) => e.id === eventId);
        if (idx === -1) continue;
        previousData.push([key, data]);
        const newEvents = [...data.events];
        newEvents[idx] = {
          ...newEvents[idx],
          status: OPTIMISTIC_BESTAETIGT_STATUS,
        };
        queryClient.setQueryData<CalendarRangeData>(key, {
          ...data,
          events: newEvents,
        });
      }
      return { previousData };
    },
    onError: (error, _eventId, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht bestätigt werden: ${errorMessage}`
      );
    },
    onSuccess: (data) => {
      toast.success(`${einsatzSingular} '${data.title}' wurde bestätigt.`);
    },
    onSettled: (data, _error, eventId) => {
      invalidateEinsatzQueries(queryClient, eventId);
      if (eventId) {
        invalidateActivityLogs(queryClient);
      }
      if (activeOrgId && data && hasDefinedStart(data)) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
        const dates = getDatesSpanningEvent({
          start: data.start,
          end: 'end' in data && data.end != null ? data.end : undefined,
        });
        invalidateCalendarMonthsForDate(queryClient, activeOrgId, dates);
      } else if (activeOrgId) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
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
    mutationFn: async ({
      eventId,
      intent,
    }: {
      eventId: string;
      intent: UserAssignmentIntent;
    }) => {
      return await toggleUserAssignmentToEinsatz(eventId, intent);
    },
    onMutate: async ({ eventId, intent }) => {
      await cancelEinsatzQueries(queryClient, activeOrgId, eventId);
      if (!activeOrgId || !userId) return {};
      const previousData: CalendarCacheSnapshot = [];
      const queries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });
      for (const [key, data] of queries) {
        if (!data) continue;
        const idx = data.events.findIndex((e) => e.id === eventId);
        if (idx === -1) continue;
        previousData.push([key, data]);
        const prev = data.events[idx];
        const assignedUsers = prev.assignedUsers ?? [];
        const isAssigned = prev.assignedUsers?.includes(userId) ?? false;
        const newAssigned =
          intent === 'assign'
            ? isAssigned
              ? assignedUsers
              : [...assignedUsers, userId]
            : intent === 'unassign'
              ? assignedUsers.filter((id) => id !== userId)
              : isAssigned
                ? assignedUsers.filter((id) => id !== userId)
                : [...assignedUsers, userId];
        const newEvents = [...data.events];
        newEvents[idx] = { ...prev, assignedUsers: newAssigned };
        queryClient.setQueryData<CalendarRangeData>(key, {
          ...data,
          events: newEvents,
        });
      }
      return { previousData };
    },
    onError: (error, _eventId, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht aktualisiert werden: ${errorMessage}`
      );
    },
    onSuccess: (data, vars) => {
      if (vars.intent === 'unassign') {
        toast.success(
          `Sie haben sich erfolgreich von ${data.title} ausgetragen`
        );
        return;
      }

      toast.success(
        `Sie haben sich erfolgreich bei '${data.title}' eingetragen`
      );
    },
    onSettled: (data) => {
      invalidateEinsatzQueries(queryClient, data?.id);
      if (data?.id) {
        invalidateActivityLogs(queryClient);
      }
      if (activeOrgId && data && hasDefinedStart(data)) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
        const dates = getDatesSpanningEvent({
          start: data.start,
          end: 'end' in data && data.end != null ? data.end : undefined,
        });
        invalidateCalendarMonthsForDate(queryClient, activeOrgId, dates);
      } else if (activeOrgId) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
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
    onMutate: async ({ eventId }) => {
      await cancelEinsatzQueries(queryClient, activeOrgId, eventId);
      if (!activeOrgId) return {};
      const previousData: CalendarCacheSnapshot = [];
      const queries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });
      for (const [key, data] of queries) {
        if (!data || !data.events.some((e) => e.id === eventId)) continue;
        previousData.push([key, data]);
        queryClient.setQueryData<CalendarRangeData>(key, {
          ...data,
          events: data.events.filter((e) => e.id !== eventId),
        });
      }
      return { previousData };
    },
    onError: (error, _vars, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht gelöscht werden: ${errorMessage}`
      );
    },
    onSuccess: (_data, vars) => {
      const title = vars.eventTitle || 'Unbenannt';
      toast.success(`${einsatzSingular} '${title}' wurde gelöscht.`);
    },
    onSettled: (_data, _error, variables) => {
      invalidateEinsatzQueries(queryClient);
      if (variables?.eventId) {
        queryClient.removeQueries({
          queryKey: queryKeys.detailedEinsatz(variables.eventId),
        });
      }
      invalidateActivityLogs(queryClient);
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
    onMutate: async ({ eventIds }) => {
      await cancelMultipleEinsatzQueries(queryClient, activeOrgId, eventIds);
      if (!activeOrgId) return {};
      const idSet = new Set(eventIds);
      const previousData: CalendarCacheSnapshot = [];
      const queries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });
      for (const [key, data] of queries) {
        if (!data || !data.events.some((e) => idSet.has(e.id))) continue;
        previousData.push([key, data]);
        queryClient.setQueryData<CalendarRangeData>(key, {
          ...data,
          events: data.events.filter((e) => !idSet.has(e.id)),
        });
      }
      return { previousData };
    },
    onError: (error, _vars, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht gelöscht werden: ${errorMessage}`
      );
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.eventIds.length + ' ' + einsatzPlural + ' wurden gelöscht.'
      );
    },
    onSettled: (_data, _error, variables) => {
      invalidateEinsatzQueries(queryClient);
      if (variables?.eventIds) {
        variables.eventIds.forEach((id) => {
          queryClient.removeQueries({
            queryKey: queryKeys.detailedEinsatz(id),
          });
        });
      }
      invalidateActivityLogs(queryClient);
      if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
    },
  });
}
