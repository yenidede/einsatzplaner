import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { queryKeys } from '../queryKeys';
import { activityLogQueryKeys } from '@/features/activity_log/queryKeys';
import type { CalendarRangeData } from '@/components/event-calendar/utils';
import { getEinsatzWithDetailsById } from '../dal-einsatz';
import { parseCalendarDateTimeString } from '@/features/einsatz/datetime';
import type { CalendarEvent } from '@/components/event-calendar/types';
import { composeRealtimeEventTitle } from '@/hooks/useSupabaseRealtime.utils';
import { staticStatusList } from '@/components/event-calendar/utils';
import type {
  EinsatzCreate,
  EinsatzDetailed,
  EinsatzDetailedWithUiState,
} from '@/features/einsatz/types';
import type { einsatz_category as EinsatzCategory } from '@/generated/prisma';
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
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

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

type CreateEinsatzMutationVariables = {
  event: EinsatzCreate;
  disableTimeConflicts?: boolean;
  tempEventId?: string;
  previousData?: CalendarCacheSnapshot;
};

type CreateEinsatzMutationContext = {
  previousData?: CalendarCacheSnapshot;
  tempEventId: string;
};
type UpdateEinsatzMutationVariables = {
  event: EinsatzCreate | CalendarEvent;
  disableTimeConflicts?: boolean;
  previousDetailedData?: EinsatzDetailedWithUiState | null;
  previousCalendarData?: CalendarCacheSnapshot;
};
type CategoryCacheItem = Pick<EinsatzCategory, 'id' | 'abbreviation'>;
type OptimisticEventInput = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  all_day?: boolean;
  assignedUsers?: string[];
  helpersNeeded?: number;
  helpers_needed?: number;
  status_id?: string;
  categories?: string[];
};

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

function invalidateActivityLogs(
  queryClient: ReturnType<typeof useQueryClient>
) {
  queryClient.invalidateQueries({
    queryKey: activityLogQueryKeys.all,
  });
}

type CalendarQueryDescriptor =
  | {
    type: 'agenda';
    queryKey: QueryKey;
  }
  | {
    type: 'month';
    monthKey: string;
    queryKey: QueryKey;
  };

function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (left, right) =>
      left.start.getTime() - right.start.getTime() ||
      left.title.localeCompare(right.title)
  );
}

function getCalendarQueryDescriptor(
  queryKey: QueryKey
): CalendarQueryDescriptor | null {
  if (queryKey.length !== 4) {
    return null;
  }

  const [, scope, orgId, segment] = queryKey;
  if (
    scope !== 'calendar' ||
    typeof orgId !== 'string' ||
    typeof segment !== 'string'
  ) {
    return null;
  }

  if (segment === 'agenda') {
    return { type: 'agenda', queryKey };
  }

  return {
    type: 'month',
    monthKey: segment,
    queryKey,
  };
}

function overlapsRange(
  start: Date,
  end: Date,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  return start < rangeEnd && end > rangeStart;
}

function isEventInCalendarQuery(
  start: Date,
  end: Date,
  descriptor: CalendarQueryDescriptor
): boolean {
  if (descriptor.type === 'agenda') {
    const rangeStart = startOfDay(new Date());
    const rangeEnd = endOfMonth(addMonths(rangeStart, 24));
    return overlapsRange(start, end, rangeStart, rangeEnd);
  }

  const focusDate = new Date(`${descriptor.monthKey}-01T00:00:00`);
  const rangeStart = startOfMonth(subMonths(focusDate, 1));
  const rangeEnd = endOfMonth(addMonths(focusDate, 1));
  return overlapsRange(start, end, rangeStart, rangeEnd);
}

function getCalendarCategoryAbbreviations(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | undefined,
  categoryIds: string[] | undefined
): string[] | undefined {
  if (categoryIds === undefined) {
    return undefined;
  }

  if (!orgId) {
    return undefined;
  }

  const categories = queryClient.getQueryData<CategoryCacheItem[]>(
    queryKeys.categories(orgId)
  );

  if (!categories) {
    return undefined;
  }

  const abbreviationById = new Map(
    categories.map((category) => [category.id, category.abbreviation?.trim() ?? ''])
  );
  const abbreviations: string[] = [];

  for (const categoryId of categoryIds) {
    const abbreviation = abbreviationById.get(categoryId);
    if (abbreviation === undefined) {
      return undefined;
    }
    if (abbreviation.length > 0) {
      abbreviations.push(abbreviation);
    }
  }

  return abbreviations;
}

function getOptimisticCalendarEvent(params: {
  currentEvent: CalendarEvent | undefined;
  nextEvent: OptimisticEventInput;
  categoryAbbreviations: string[] | undefined;
}): CalendarEvent {
  const { currentEvent, nextEvent, categoryAbbreviations } = params;
  return {
    id: nextEvent.id,
    title: composeRealtimeEventTitle({
      existingTitle: currentEvent?.title ?? nextEvent.title,
      nextBaseTitle: nextEvent.title,
      categoryAbbreviations,
    }),
    start: nextEvent.start,
    end: nextEvent.end,
    allDay: nextEvent.all_day ?? nextEvent.allDay ?? currentEvent?.allDay,
    status: getOptimisticStatus(nextEvent, currentEvent?.status),
    assignedUsers: nextEvent.assignedUsers ?? currentEvent?.assignedUsers ?? [],
    helpersNeeded: nextEvent.helpers_needed ?? nextEvent.helpersNeeded ?? currentEvent?.helpersNeeded,
  };
}

function getOptimisticStatus(
  nextEvent: OptimisticEventInput,
  currentStatus: CalendarEvent['status']
): CalendarEvent['status'] {
  if (!nextEvent.status_id) {
    return currentStatus;
  }

  return (
    staticStatusList.find((status) => status.id === nextEvent.status_id) ??
    currentStatus
  );
}

function removeCalendarEventFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | undefined,
  eventId: string
) {
  if (!orgId) {
    return;
  }

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    if (!currentData) {
      return;
    }

    let hasChanges = false;
    const events = currentData.events.filter((event) => {
      if (event.id !== eventId) {
        return true;
      }

      hasChanges = true;
      return false;
    });

    if (!hasChanges) {
      return;
    }

    queryClient.setQueryData<CalendarRangeData>(queryKey, {
      ...currentData,
      events,
    });
  });
}

function updateCalendarRangeWithOptimisticEvent(
  data: CalendarRangeData | undefined,
  einsatzId: string,
  nextEvent: OptimisticEventInput,
  categoryAbbreviations: string[] | undefined,
  queryKey: QueryKey
): CalendarRangeData | undefined {
  if (!data) {
    return data;
  }

  const descriptor = getCalendarQueryDescriptor(queryKey);
  if (!descriptor) {
    return data;
  }

  const currentEvent = data.events.find((event) => event.id === einsatzId);
  const isInRange = isEventInCalendarQuery(nextEvent.start, nextEvent.end, descriptor);

  if (!isInRange) {
    if (!currentEvent) {
      return data;
    }

    return {
      ...data,
      events: data.events.filter((event) => event.id !== einsatzId),
    };
  }

  const optimisticEvent = getOptimisticCalendarEvent({
    currentEvent,
    nextEvent,
    categoryAbbreviations,
  });

  if (currentEvent) {
    return {
      ...data,
      events: sortCalendarEvents(
        data.events.map((event) =>
          event.id === einsatzId ? optimisticEvent : event
        )
      ),
    };
  }

  return {
    ...data,
    events: sortCalendarEvents([...data.events, optimisticEvent]),
  };
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

function lockDetailedEinsatzCache(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | undefined,
  einsatzId: string
) {
  queryClient.setQueryData<EinsatzDetailedWithUiState | null>(
    queryKeys.detailedEinsatz(einsatzId),
    (currentData) =>
      currentData ? { ...currentData, isLocked: true } : currentData
  );

  if (!orgId) {
    return;
  }

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    if (!currentData) {
      return;
    }

    let hasChanges = false;
    const detailedEinsaetze = currentData.detailedEinsaetze.map((entry) => {
      if (entry.id !== einsatzId) {
        return entry;
      }

      hasChanges = true;
      return {
        ...entry,
        isLocked: true,
      };
    });

    if (!hasChanges) {
      return;
    }

    queryClient.setQueryData<CalendarRangeData>(queryKey, {
      ...currentData,
      detailedEinsaetze,
    });
  });
}

function updateDetailedCalendarCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | undefined,
  freshEinsatz: EinsatzDetailed
) {
  queryClient.setQueryData(queryKeys.detailedEinsatz(freshEinsatz.id), freshEinsatz);

  if (!orgId) {
    return;
  }

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    if (!currentData) {
      return;
    }

    let hasChanges = false;
    const detailedEinsaetze = currentData.detailedEinsaetze.map((entry) => {
      if (entry.id !== freshEinsatz.id) {
        return entry;
      }

      hasChanges = true;
      const updatedEntry: CalendarRangeData['detailedEinsaetze'][number] = {
        ...freshEinsatz,
        category_abbreviations: entry.category_abbreviations,
      };
      return updatedEntry;
    });

    if (!hasChanges) {
      return;
    }

    queryClient.setQueryData<CalendarRangeData>(queryKey, {
      ...currentData,
      detailedEinsaetze,
    });
  });
}

function restoreDetailedEinsatzCache(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | undefined,
  einsatzId: string,
  previousData: EinsatzDetailedWithUiState | null | undefined
) {
  if (previousData) {
    queryClient.setQueryData<EinsatzDetailedWithUiState | null>(
      queryKeys.detailedEinsatz(einsatzId),
      previousData
    );
  } else {
    queryClient.removeQueries({
      queryKey: queryKeys.detailedEinsatz(einsatzId),
    });
  }

  if (!orgId) {
    return;
  }

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    if (!currentData) {
      return;
    }

    let hasChanges = false;
    const detailedEinsaetze = currentData.detailedEinsaetze.map((entry) => {
      if (entry.id !== einsatzId) {
        return entry;
      }

      hasChanges = true;

      if (previousData) {
        return {
          ...previousData,
          category_abbreviations: entry.category_abbreviations,
        };
      }

      const next = { ...entry };
      delete next.isLocked;
      return next;
    });

    if (!hasChanges) {
      return;
    }

    queryClient.setQueryData<CalendarRangeData>(queryKey, {
      ...currentData,
      detailedEinsaetze,
    });
  });
}

async function refreshDetailedEinsatzCache(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | undefined,
  einsatzId: string
) {
  const freshEinsatz = await queryClient.fetchQuery({
    queryKey: queryKeys.detailedEinsatz(einsatzId),
    staleTime: 0,
    queryFn: async () => {
      const result = await getEinsatzWithDetailsById(einsatzId);
      if (result instanceof Response) {
        throw new Error(
          `Einsatz konnte nicht geladen werden: ${result.statusText}`
        );
      }

      if (!result) {
        throw new Error(`Einsatz mit ID ${einsatzId} konnte nicht geladen werden.`);
      }

      return result;
    },
    retry: false,
  });

  updateDetailedCalendarCaches(queryClient, orgId, freshEinsatz);
}

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

  const mutation = useMutation({
    mutationFn: async ({
      event,
      disableTimeConflicts = false,
    }: CreateEinsatzMutationVariables) => {
      return createEinsatz({ data: event, disableTimeConflicts });
    },
    onMutate: async ({
      event,
      tempEventId,
      previousData,
    }: CreateEinsatzMutationVariables): Promise<CreateEinsatzMutationContext> => {
      await cancelEinsatzQueries(queryClient, activeOrgId);
      const optimisticTempEventId =
        tempEventId ?? `temp-${crypto.randomUUID()}`;
      if (!activeOrgId) {
        return { tempEventId: optimisticTempEventId, previousData };
      }
      if (tempEventId && previousData) {
        return { tempEventId: optimisticTempEventId, previousData };
      }
      const optimisticEvent: OptimisticEventInput = {
        id: optimisticTempEventId,
        title: event.title,
        start: toMutationDate(event.start),
        end: toMutationDate(event.end),
        allDay: event.all_day ?? false,
        assignedUsers: event.assignedUsers ?? [],
        helpersNeeded: event.helpers_needed,
        categories: event.categories,
      };
      const previousCalendarData: CalendarCacheSnapshot = [];
      const categoryAbbreviations = getCalendarCategoryAbbreviations(
        queryClient,
        activeOrgId,
        event.categories
      );
      const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });

      calendarQueries.forEach(([queryKey, currentData]) => {
        const nextData = updateCalendarRangeWithOptimisticEvent(
          currentData,
          optimisticTempEventId,
          optimisticEvent,
          categoryAbbreviations,
          queryKey
        );

        if (nextData !== currentData) {
          previousCalendarData.push([queryKey, currentData]);
          queryClient.setQueryData<CalendarRangeData>(queryKey, nextData);
        }
      });
      return { previousData: previousCalendarData, tempEventId: optimisticTempEventId };
    },
    onError: (error, _vars, context) => {
      if (context?.previousData) {
        rollbackCalendarCache(queryClient, context.previousData);
      } else if (context?.tempEventId) {
        removeCalendarEventFromCache(queryClient, activeOrgId, context.tempEventId);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht erstellt werden: ${errorMessage}`
      );
    },
    onSuccess: async (data, vars, context) => {
      if (data.conflicts && data.conflicts.length > 0) {
        // Show confirmation dialog
        const dialogResult = await showDestructive(
          'Warnung: Zeitkonflikte erkannt',
          'Folgende Personen haben bereits einen Einsatz in diesem Zeitraum:\n\n' +
          formatConflictMessages(data.conflicts),
          {
            confirmText: 'Trotzdem fortfahren',
            cancelText: 'Abbrechen',
          }
        );

        if (dialogResult === 'success') {
          // User confirmed, retry with conflicts disabled
          mutation.mutate({
            event: vars.event,
            disableTimeConflicts: true,
            tempEventId: context?.tempEventId,
            previousData: context?.previousData,
          });
        } else {
          if (context?.previousData) {
            rollbackCalendarCache(queryClient, context.previousData);
          } else if (context?.tempEventId) {
            removeCalendarEventFromCache(queryClient, activeOrgId, context.tempEventId);
          }
          // User cancelled, open the event dialog if callback provided
          if (onConflictCancel && data.conflicts.length > 0) {
            // Get the first conflicting einsatz ID
            const conflictingEinsatzId =
              data.conflicts[0].conflictingEinsatz.id;
            onConflictCancel(conflictingEinsatzId);
          }
        }
      } else if (data.einsatz) {
        try {
          await refreshDetailedEinsatzCache(
            queryClient,
            activeOrgId,
            data.einsatz.id
          );
        } catch {
          invalidateEinsatzQueries(queryClient, data.einsatz.id);
        }
        toast.success(
          `${einsatzSingular} '${vars.event.title}' wurde erstellt.`
        );
      }
    },
    onSettled: (data, _error, vars, context) => {
      if (data?.conflicts && data.conflicts.length > 0 && !data.einsatz) {
        return;
      }
      const event = data?.einsatz ?? vars?.event;
      invalidateEinsatzQueries(queryClient);
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
      if (data?.einsatz && context?.previousData) {
        invalidateCalendarSnapshot(queryClient, context.previousData);
      }
    },
  });

  return {
    ...mutation,
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
  const { showDestructive } = useConfirmDialog();

  const mutation = useMutation({
    mutationFn: async ({
      event,
      disableTimeConflicts = false,
    }: UpdateEinsatzMutationVariables) => {
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
    onMutate: async ({
      event,
      previousDetailedData,
      previousCalendarData,
    }: UpdateEinsatzMutationVariables) => {
      await cancelEinsatzQueries(queryClient, activeOrgId, event.id);
      if (!activeOrgId) return { didLock: false };
      const eventId = event.id;
      if (!eventId) return { didLock: false };
      const rollbackDetailedData =
        previousDetailedData !== undefined
          ? previousDetailedData
          : queryClient.getQueryData<EinsatzDetailedWithUiState | null>(
          queryKeys.detailedEinsatz(eventId)
        );
      const currentMutationCalendarData: CalendarCacheSnapshot = [];
      const categoryAbbreviations = getCalendarCategoryAbbreviations(
        queryClient,
        activeOrgId,
        'categories' in event && Array.isArray(event.categories)
          ? event.categories
          : undefined
      );
      const optimisticEvent: OptimisticEventInput = {
        ...event,
        id: eventId,
      };
      const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
        queryKey: queryKeys.einsaetzeForCalendarPrefix(activeOrgId),
      });

      calendarQueries.forEach(([queryKey, currentData]) => {
        const nextData = updateCalendarRangeWithOptimisticEvent(
          currentData,
          eventId,
          optimisticEvent,
          categoryAbbreviations,
          queryKey
        );

        if (nextData !== currentData) {
          if (!previousCalendarData) {
            currentMutationCalendarData.push([queryKey, currentData]);
          }
          queryClient.setQueryData<CalendarRangeData>(queryKey, nextData);
        }
      });

      lockDetailedEinsatzCache(queryClient, activeOrgId, eventId);
      return {
        didLock: true,
        eventId,
        previousDetailedData: rollbackDetailedData,
        previousCalendarData: previousCalendarData ?? currentMutationCalendarData,
      };
    },
    onError: (error, _vars, context) => {
      if (context?.didLock && context.eventId) {
        restoreDetailedEinsatzCache(
          queryClient,
          activeOrgId,
          context.eventId,
          context.previousDetailedData
        );
        if (context.previousCalendarData) {
          rollbackCalendarCache(queryClient, context.previousCalendarData);
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht aktualisiert werden: ${errorMessage}`
      );
    },
    onSuccess: async (data, vars, context) => {
      const einsatz = 'einsatz' in data ? data.einsatz : data;
      const conflicts = 'conflicts' in data ? data.conflicts : [];
      const einsatzId = einsatz && 'id' in einsatz ? einsatz.id : undefined;

      if (conflicts && conflicts.length > 0) {
        // Show confirmation dialog
        const dialogResult = await showDestructive(
          'Warnung: Zeitkonflikte erkannt',
          'Folgende Personen haben bereits einen Einsatz in diesem Zeitraum:\n\n' +
          formatConflictMessages(conflicts) +
          '\n\nMöchten Sie trotzdem fortfahren?',
          {
            confirmText: 'Trotzdem fortfahren',
            cancelText: 'Abbrechen',
          }
        );

        if (dialogResult === 'success') {
          // User confirmed, retry with conflicts disabled
          mutation.mutate({
            event: vars.event,
            disableTimeConflicts: true,
            previousDetailedData: context?.previousDetailedData,
            previousCalendarData: context?.previousCalendarData,
          });
        } else {
          if (context?.didLock && context.eventId) {
            restoreDetailedEinsatzCache(
              queryClient,
              activeOrgId,
              context.eventId,
              context.previousDetailedData
            );
            if (context.previousCalendarData) {
              rollbackCalendarCache(queryClient, context.previousCalendarData);
            }
          }
          // User cancelled, open the event dialog if callback provided
          if (onConflictCancel && conflicts.length > 0) {
            // Get the first conflicting einsatz ID
            const conflictingEinsatzId = conflicts[0].conflictingEinsatz.id;
            onConflictCancel(conflictingEinsatzId);
          }
        }
      } else if (einsatz) {
        if (einsatzId) {
          try {
            await refreshDetailedEinsatzCache(
              queryClient,
              activeOrgId,
              einsatzId
            );
          } catch {
          }
          invalidateEinsatzQueries(queryClient, einsatzId);
        }
        const title =
          'title' in vars.event ? vars.event.title : einsatzSingular;
        toast.success(`${einsatzSingular} '${title}' wurde aktualisiert.`);
        if (einsatzId) {
          invalidateActivityLogs(queryClient);
        }
      }
    },
    onSettled: (data, _error, vars) => {
      if (
        data &&
        'conflicts' in data &&
        data.conflicts &&
        data.conflicts.length > 0 &&
        !data.einsatz
      ) {
        return;
      }
      const fallbackEinsatzId = vars?.event?.id;
      if (!data && fallbackEinsatzId) {
        invalidateEinsatzQueries(queryClient, fallbackEinsatzId);
      }
      if (activeOrgId) {
        invalidateAgendaForOrg(queryClient, activeOrgId);
      }
      if (activeOrgId) {
        invalidateAllCalendarMonthsForOrg(queryClient, activeOrgId);
      }
    },
  });

  return {
    ...mutation,
    mutate: (event: EinsatzCreate | CalendarEvent) =>
      mutation.mutate({ event }),
    mutateAsync: (event: EinsatzCreate | CalendarEvent) =>
      mutation.mutateAsync({ event }),
  };
}

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
      if (!activeOrgId) return { didLock: false };
      const previousDetailedData = queryClient.getQueryData<EinsatzDetailedWithUiState | null>(
        queryKeys.detailedEinsatz(eventId)
      );
      lockDetailedEinsatzCache(queryClient, activeOrgId, eventId);
      return { didLock: true, eventId, previousDetailedData };
    },
    onError: (error, _eventId, context) => {
      if (context?.didLock && context.eventId) {
        restoreDetailedEinsatzCache(
          queryClient,
          activeOrgId,
          context.eventId,
          context.previousDetailedData
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht bestätigt werden: ${errorMessage}`
      );
    },
    onSuccess: async (data) => {
      try {
        await refreshDetailedEinsatzCache(queryClient, activeOrgId, data.id);
      } catch {
        invalidateEinsatzQueries(queryClient, data.id);
      }
      toast.success(`${einsatzSingular} '${data.title}' wurde bestätigt.`);
    },
    onSettled: (data, _error, _eventId) => {
      invalidateEinsatzQueries(queryClient);
      if (_eventId) {
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
    onMutate: async ({ eventId }) => {
      await cancelEinsatzQueries(queryClient, activeOrgId, eventId);
      if (!activeOrgId || !userId) return { didLock: false };
      const previousDetailedData = queryClient.getQueryData<EinsatzDetailedWithUiState | null>(
        queryKeys.detailedEinsatz(eventId)
      );
      lockDetailedEinsatzCache(queryClient, activeOrgId, eventId);
      return { didLock: true, eventId, previousDetailedData };
    },
    onError: (error, _vars, context) => {
      if (context?.didLock && context.eventId) {
        restoreDetailedEinsatzCache(
          queryClient,
          activeOrgId,
          context.eventId,
          context.previousDetailedData
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `${einsatzSingular} konnte nicht aktualisiert werden: ${errorMessage}`
      );
    },
    onSuccess: async (data, vars) => {
      try {
        await refreshDetailedEinsatzCache(queryClient, activeOrgId, data.id);
      } catch {
        invalidateEinsatzQueries(queryClient, data.id);
      }
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
      invalidateEinsatzQueries(queryClient);
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
