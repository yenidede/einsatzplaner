import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import {
  addMonths,
  addYears,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { queryKeys } from '@/features/einsatz/queryKeys';
import { supabaseRealtimeClient } from '@/lib/supabase-client';
import {
  type CalendarRangeData,
  staticStatusList,
} from '@/components/event-calendar/utils';
import type {
  EinsatzDetailed,
  EinsatzDetailedForCalendar,
  EinsatzListItem,
} from '@/features/einsatz/types';
import type { CalendarEvent } from '@/components/event-calendar/types';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type { einsatz as Einsatz } from '@/generated/prisma';

type EinsatzRow = {
  id: string;
  org_id: string;
  title?: string;
  start?: string | null;
  end?: string | null;
  all_day?: boolean;
  status_id?: string | null;
  helpers_needed?: number;
  participant_count?: number | null;
  price_per_person?: number | null;
  total_price?: number | null;
  anmerkung?: string | null;
  template_id?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type EinsatzPayload = RealtimePostgresChangesPayload<EinsatzRow>;

type EinsatzHelperRow = {
  einsatz_id: string;
  org_id: string;
  user_id: string;
  [key: string]: unknown;
};

type EinsatzHelperPayload = RealtimePostgresChangesPayload<EinsatzHelperRow>;

type EinsatzHelperRecord = {
  einsatz_id?: string;
  user_id?: string;
};

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

type EinsatzBasePatch = Partial<
  Pick<
    Einsatz,
    | 'title'
    | 'all_day'
    | 'helpers_needed'
    | 'participant_count'
    | 'price_per_person'
    | 'total_price'
    | 'anmerkung'
    | 'template_id'
  >
> & {
  start?: Date;
  end?: Date;
  status_id?: string;
  updated_at?: Date | null;
};

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

function isEinsatzRow(value: unknown): value is EinsatzRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeRow = value as Record<string, unknown>;
  return typeof maybeRow.id === 'string' && typeof maybeRow.org_id === 'string';
}

function isEinsatzHelperRecord(value: unknown): value is EinsatzHelperRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeRecord = value as Record<string, unknown>;
  const einsatzId = maybeRecord.einsatz_id;
  const userId = maybeRecord.user_id;

  return (
    (einsatzId === undefined || typeof einsatzId === 'string') &&
    (userId === undefined || typeof userId === 'string')
  );
}

function buildEinsatzBasePatch(record: Partial<EinsatzRow>): EinsatzBasePatch {
  const patch: EinsatzBasePatch = {};

  if (record.title !== undefined) patch.title = record.title;
  if (record.start !== undefined) patch.start = toDate(record.start);
  if (record.end !== undefined) patch.end = toDate(record.end);
  if (record.all_day !== undefined) patch.all_day = record.all_day;
  if (typeof record.status_id === 'string') patch.status_id = record.status_id;
  if (record.helpers_needed !== undefined) patch.helpers_needed = record.helpers_needed;
  if (record.participant_count !== undefined) {
    patch.participant_count = record.participant_count;
  }
  if (record.price_per_person !== undefined) {
    patch.price_per_person = record.price_per_person;
  }
  if (record.total_price !== undefined) patch.total_price = record.total_price;
  if (record.anmerkung !== undefined) patch.anmerkung = record.anmerkung;
  if (record.template_id !== undefined) patch.template_id = record.template_id;
  if (record.updated_at !== undefined) patch.updated_at = toDate(record.updated_at) ?? null;

  return patch;
}

function addUserId(userIds: string[] | undefined, userId: string): string[] {
  const currentUserIds = userIds ?? [];
  return currentUserIds.includes(userId) ? currentUserIds : [...currentUserIds, userId];
}

function removeUserId(userIds: string[] | undefined, userId: string): string[] {
  return (userIds ?? []).filter((currentUserId) => currentUserId !== userId);
}

function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (left, right) =>
      left.start.getTime() - right.start.getTime() ||
      left.title.localeCompare(right.title)
  );
}

function sortDetailedEinsaetze(
  einsaetze: EinsatzDetailedForCalendar[]
): EinsatzDetailedForCalendar[] {
  return [...einsaetze].sort(
    (left, right) =>
      left.start.getTime() - right.start.getTime() ||
      left.title.localeCompare(right.title)
  );
}

function mapStatus(
  statusId: string | undefined,
  currentStatus: CalendarEvent['status']
) {
  if (!statusId) {
    return currentStatus;
  }

  const nextStatus = staticStatusList.find((status) => status.id === statusId);
  return nextStatus ?? currentStatus;
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

function isRecordInCalendarQuery(
  record: Partial<EinsatzRow>,
  descriptor: CalendarQueryDescriptor
): boolean {
  const start = toDate(record.start);
  const end = toDate(record.end) ?? start;

  if (!start || !end) {
    return false;
  }

  if (descriptor.type === 'agenda') {
    const rangeStart = startOfDay(new Date());
    const rangeEnd = endOfMonth(addYears(rangeStart, 2));
    return overlapsRange(start, end, rangeStart, rangeEnd);
  }

  const focusDate = new Date(`${descriptor.monthKey}-01T00:00:00`);
  const rangeStart = startOfMonth(subMonths(focusDate, 1));
  const rangeEnd = endOfMonth(addMonths(focusDate, 1));
  return overlapsRange(start, end, rangeStart, rangeEnd);
}

function applyPatchToDetailedEinsatz(
  detailedEinsatz: EinsatzDetailed | null | undefined,
  patch: EinsatzBasePatch
): EinsatzDetailed | null | undefined {
  if (!detailedEinsatz) {
    return detailedEinsatz;
  }

  return {
    ...detailedEinsatz,
    ...patch,
    start: patch.start ?? detailedEinsatz.start,
    end: patch.end ?? detailedEinsatz.end,
    updated_at:
      patch.updated_at === undefined ? detailedEinsatz.updated_at : patch.updated_at,
    status_id: patch.status_id ?? detailedEinsatz.status_id,
  };
}

function applyPatchToCalendarDetailedEinsatz(
  detailedEinsatz: EinsatzDetailedForCalendar,
  patch: EinsatzBasePatch
): EinsatzDetailedForCalendar {
  return {
    ...detailedEinsatz,
    ...patch,
    start: patch.start ?? detailedEinsatz.start,
    end: patch.end ?? detailedEinsatz.end,
    updated_at:
      patch.updated_at === undefined ? detailedEinsatz.updated_at : patch.updated_at,
    status_id: patch.status_id ?? detailedEinsatz.status_id,
  };
}

function applyPatchToCalendarEvent(
  event: CalendarEvent,
  patch: EinsatzBasePatch
): CalendarEvent {
  return {
    ...event,
    title: patch.title ?? event.title,
    start: patch.start ?? event.start,
    end: patch.end ?? event.end,
    allDay: patch.all_day ?? event.allDay,
    helpersNeeded: patch.helpers_needed ?? event.helpersNeeded,
    status: mapStatus(patch.status_id, event.status),
  };
}

function applyPatchToListItem(
  listItem: EinsatzListItem,
  patch: EinsatzBasePatch
): EinsatzListItem {
  const nextStatus = patch.status_id
    ? staticStatusList.find((status) => status.id === patch.status_id)
    : null;

  return {
    ...listItem,
    ...patch,
    start: patch.start ?? listItem.start,
    end: patch.end ?? listItem.end,
    updated_at: patch.updated_at === undefined ? listItem.updated_at : patch.updated_at,
    status_id: patch.status_id ?? listItem.status_id,
    status_verwalter_text: nextStatus?.verwalter_text ?? listItem.status_verwalter_text,
    status_helper_text: nextStatus?.helper_text ?? listItem.status_helper_text,
    status_verwalter_color:
      nextStatus?.verwalter_color ?? listItem.status_verwalter_color,
    status_helper_color: nextStatus?.helper_color ?? listItem.status_helper_color,
  };
}

function updateCalendarRangeWithPatch(
  data: CalendarRangeData | undefined,
  einsatzId: string,
  patch: EinsatzBasePatch,
  nextRecord: Partial<EinsatzRow>,
  descriptor: CalendarQueryDescriptor
): { nextData: CalendarRangeData | undefined; requiresRefetch: boolean } {
  if (!data) {
    return { nextData: data, requiresRefetch: false };
  }

  const eventIndex = data.events.findIndex((event) => event.id === einsatzId);
  const detailedIndex = data.detailedEinsaetze.findIndex(
    (detailedEinsatz) => detailedEinsatz.id === einsatzId
  );
  const isInRange = isRecordInCalendarQuery(nextRecord, descriptor);
  const existsInCache = eventIndex !== -1 || detailedIndex !== -1;

  if (!isInRange) {
    if (!existsInCache) {
      return { nextData: data, requiresRefetch: false };
    }

    return {
      nextData: {
        ...data,
        events: data.events.filter((event) => event.id !== einsatzId),
        detailedEinsaetze: data.detailedEinsaetze.filter(
          (detailedEinsatz) => detailedEinsatz.id !== einsatzId
        ),
      },
      requiresRefetch: false,
    };
  }

  if (!existsInCache) {
    return { nextData: data, requiresRefetch: true };
  }

  const nextEvents =
    eventIndex === -1
      ? data.events
      : sortCalendarEvents(
        data.events.map((event) =>
          event.id === einsatzId ? applyPatchToCalendarEvent(event, patch) : event
        )
      );

  const nextDetailedEinsaetze =
    detailedIndex === -1
      ? data.detailedEinsaetze
      : sortDetailedEinsaetze(
        data.detailedEinsaetze.map((detailedEinsatz) =>
          detailedEinsatz.id === einsatzId
            ? applyPatchToCalendarDetailedEinsatz(detailedEinsatz, patch)
            : detailedEinsatz
        )
      );

  return {
    nextData: {
      ...data,
      events: nextEvents,
      detailedEinsaetze: nextDetailedEinsaetze,
    },
    requiresRefetch: false,
  };
}

function matchesEinsatzListQueryForOrg(
  queryKey: readonly unknown[],
  orgId: string
) {
  if (queryKey[0] !== 'einsatz' || queryKey[1] !== 'list') {
    return false;
  }

  const scope = queryKey[2];
  if (scope === orgId) {
    return true;
  }

  return (
    Array.isArray(scope) &&
    scope.some((value): value is string => value === orgId)
  );
}

function syncEinsatzListCaches(
  queryClient: QueryClient,
  orgId: string,
  einsatzId: string,
  patch: EinsatzBasePatch
) {
  const listQueries = queryClient.getQueriesData<EinsatzListItem[]>({
    queryKey: queryKeys.einsaetzeListPrefix(),
  });

  listQueries.forEach(([queryKey, currentData]) => {
    if (!currentData || !matchesEinsatzListQueryForOrg(queryKey, orgId)) {
      return;
    }

    if (!currentData.some((item) => item.id === einsatzId)) {
      return;
    }

    queryClient.setQueryData<EinsatzListItem[]>(
      queryKey,
      currentData.map((item) =>
        item.id === einsatzId ? applyPatchToListItem(item, patch) : item
      )
    );
  });
}

function syncSimpleCalendarListCache(
  queryClient: QueryClient,
  orgId: string,
  einsatzId: string,
  patch: EinsatzBasePatch
) {
  queryClient.setQueryData<CalendarEvent[]>(
    queryKeys.einsaetze(orgId),
    (currentData) => {
      if (!currentData || !currentData.some((event) => event.id === einsatzId)) {
        return currentData;
      }

      return sortCalendarEvents(
        currentData.map((event) =>
          event.id === einsatzId ? applyPatchToCalendarEvent(event, patch) : event
        )
      );
    }
  );
}

function removeEinsatzFromCaches(
  queryClient: QueryClient,
  orgId: string,
  einsatzId: string
) {
  queryClient.removeQueries({
    queryKey: queryKeys.detailedEinsatz(einsatzId),
  });

  queryClient.setQueryData<CalendarEvent[]>(
    queryKeys.einsaetze(orgId),
    (currentData) => currentData?.filter((event) => event.id !== einsatzId) ?? currentData
  );

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    if (!currentData) {
      return;
    }

    const nextEvents = currentData.events.filter((event) => event.id !== einsatzId);
    const nextDetailedEinsaetze = currentData.detailedEinsaetze.filter(
      (detailedEinsatz) => detailedEinsatz.id !== einsatzId
    );

    if (
      nextEvents.length === currentData.events.length &&
      nextDetailedEinsaetze.length === currentData.detailedEinsaetze.length
    ) {
      return;
    }

    queryClient.setQueryData<CalendarRangeData>(queryKey, {
      ...currentData,
      events: nextEvents,
      detailedEinsaetze: nextDetailedEinsaetze,
    });
  });

  const listQueries = queryClient.getQueriesData<EinsatzListItem[]>({
    queryKey: queryKeys.einsaetzeListPrefix(),
  });

  listQueries.forEach(([queryKey, currentData]) => {
    if (!currentData || !matchesEinsatzListQueryForOrg(queryKey, orgId)) {
      return;
    }

    const nextData = currentData.filter((item) => item.id !== einsatzId);
    if (nextData.length !== currentData.length) {
      queryClient.setQueryData<EinsatzListItem[]>(queryKey, nextData);
    }
  });
}

function syncEinsatzRealtimeCaches(
  queryClient: QueryClient,
  orgId: string,
  payload: EinsatzPayload
) {
  const nextRecord = isEinsatzRow(payload.new) ? payload.new : null;
  const previousRecord = isEinsatzRow(payload.old) ? payload.old : null;
  const einsatzId = nextRecord?.id || previousRecord?.id;

  if (!einsatzId) {
    return;
  }

  if (payload.eventType === 'DELETE') {
    removeEinsatzFromCaches(queryClient, orgId, einsatzId);
    return;
  }

  const patch = buildEinsatzBasePatch(nextRecord ?? previousRecord ?? {});

  queryClient.setQueryData<EinsatzDetailed | null>(
    queryKeys.detailedEinsatz(einsatzId),
    (currentData) => applyPatchToDetailedEinsatz(currentData, patch) ?? null
  );

  syncSimpleCalendarListCache(queryClient, orgId, einsatzId, patch);
  syncEinsatzListCaches(queryClient, orgId, einsatzId, patch);

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    const descriptor = getCalendarQueryDescriptor(queryKey);
    if (!descriptor) {
      return;
    }

    const { nextData, requiresRefetch } = updateCalendarRangeWithPatch(
      currentData,
      einsatzId,
      patch,
      nextRecord ?? previousRecord ?? {},
      descriptor
    );

    if (nextData !== currentData) {
      queryClient.setQueryData<CalendarRangeData>(queryKey, nextData);
    }

    if (requiresRefetch) {
      queryClient.invalidateQueries({ queryKey });
    }
  });
}

function updateDetailedEinsatzAssignments(
  detailedEinsatz: EinsatzDetailed | null | undefined,
  userId: string,
  operation: 'add' | 'remove'
): EinsatzDetailed | null | undefined {
  if (!detailedEinsatz) {
    return detailedEinsatz;
  }

  const assignedUsers =
    operation === 'add'
      ? addUserId(detailedEinsatz.assigned_users, userId)
      : removeUserId(detailedEinsatz.assigned_users, userId);

  return {
    ...detailedEinsatz,
    assigned_users: assignedUsers,
  };
}

function updateDetailedEinsatzForCalendarAssignments(
  detailedEinsatz: EinsatzDetailedForCalendar,
  userId: string,
  operation: 'add' | 'remove'
): EinsatzDetailedForCalendar {
  const assignedUsers =
    operation === 'add'
      ? addUserId(detailedEinsatz.assigned_users, userId)
      : removeUserId(detailedEinsatz.assigned_users, userId);

  return {
    ...detailedEinsatz,
    assigned_users: assignedUsers,
  };
}

function updateCalendarRangeAssignments(
  data: CalendarRangeData | undefined,
  einsatzId: string,
  userId: string,
  operation: 'add' | 'remove'
): CalendarRangeData | undefined {
  if (!data) {
    return data;
  }

  let hasChanges = false;

  const events = data.events.map((event) => {
    if (event.id !== einsatzId) {
      return event;
    }

    hasChanges = true;
    return {
      ...event,
      assignedUsers:
        operation === 'add'
          ? addUserId(event.assignedUsers, userId)
          : removeUserId(event.assignedUsers, userId),
    };
  });

  const detailedEinsaetze = data.detailedEinsaetze.map((detailedEinsatz) => {
    if (detailedEinsatz.id !== einsatzId) {
      return detailedEinsatz;
    }

    hasChanges = true;
    return updateDetailedEinsatzForCalendarAssignments(
      detailedEinsatz,
      userId,
      operation
    );
  });

  if (!hasChanges) {
    return data;
  }

  return {
    ...data,
    events,
    detailedEinsaetze,
  };
}

function applyHelperAssignmentChange(
  queryClient: QueryClient,
  orgId: string,
  einsatzId: string,
  userId: string,
  operation: 'add' | 'remove'
) {
  queryClient.setQueryData<EinsatzDetailed | null>(
    queryKeys.detailedEinsatz(einsatzId),
    (currentData) =>
      updateDetailedEinsatzAssignments(currentData, userId, operation) ?? null
  );

  const calendarQueries = queryClient.getQueriesData<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
  });

  calendarQueries.forEach(([queryKey, currentData]) => {
    const nextData = updateCalendarRangeAssignments(
      currentData,
      einsatzId,
      userId,
      operation
    );

    if (nextData !== currentData) {
      queryClient.setQueryData<CalendarRangeData>(queryKey, nextData);
    }
  });
}

function syncHelperRealtimeCaches(
  queryClient: QueryClient,
  orgId: string,
  payload: EinsatzHelperPayload
) {
  const oldRecord = isEinsatzHelperRecord(payload.old) ? payload.old : null;
  const newRecord = isEinsatzHelperRecord(payload.new) ? payload.new : null;

  if (oldRecord?.einsatz_id && oldRecord.user_id) {
    applyHelperAssignmentChange(
      queryClient,
      orgId,
      oldRecord.einsatz_id,
      oldRecord.user_id,
      'remove'
    );
  }

  if (newRecord?.einsatz_id && newRecord.user_id) {
    applyHelperAssignmentChange(
      queryClient,
      orgId,
      newRecord.einsatz_id,
      newRecord.user_id,
      'add'
    );
  }
}

export function useSupabaseRealtime(orgId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const einsatzChannelRef = useRef<RealtimeChannel | null>(null);
  const einsatzHelperChannelRef = useRef<RealtimeChannel | null>(null);
  const einsatzConnectedRef = useRef(false);
  const helperConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    einsatzConnectedRef.current = false;
    helperConnectedRef.current = false;

    if (!orgId || !session?.user?.id) {
      setIsConnected(false);
      return;
    }

    const updateConnectionState = () => {
      setIsConnected(
        einsatzConnectedRef.current && helperConnectedRef.current
      );
    };

    const einsatzChannelName = `einsatz-changes:${orgId}:${Date.now()}`;
    const einsatzChannel = supabaseRealtimeClient.channel(einsatzChannelName);
    einsatzChannelRef.current = einsatzChannel;

    einsatzChannel
      .on<EinsatzRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'einsatz',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;
          syncEinsatzRealtimeCaches(queryClient, orgId, payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          einsatzConnectedRef.current = true;
          updateConnectionState();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          einsatzConnectedRef.current = false;
          updateConnectionState();
        }
      });

    const einsatzHelperChannelName = `einsatz-helper-changes:${orgId}:${Date.now()}`;
    const einsatzHelperChannel = supabaseRealtimeClient.channel(
      einsatzHelperChannelName
    );
    einsatzHelperChannelRef.current = einsatzHelperChannel;

    einsatzHelperChannel
      .on<EinsatzHelperRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'einsatz_helper',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          syncHelperRealtimeCaches(queryClient, orgId, payload);

          queryClient.invalidateQueries({
            queryKey: queryKeys.allLists(),
            predicate: (query) => matchesEinsatzListQueryForOrg(query.queryKey, orgId),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          helperConnectedRef.current = true;
          updateConnectionState();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          helperConnectedRef.current = false;
          updateConnectionState();
        }

        if (status === 'CHANNEL_ERROR') {
          console.error(
            '[Supabase Realtime] einsatz_helper subscription failed. Pruefen Sie, ob einsatz_helper.org_id bereits in der Datenbank existiert.'
          );
        }
      });

    return () => {
      isMountedRef.current = false;
      einsatzConnectedRef.current = false;
      helperConnectedRef.current = false;
      if (einsatzChannelRef.current) {
        supabaseRealtimeClient.removeChannel(einsatzChannelRef.current);
        einsatzChannelRef.current = null;
      }
      if (einsatzHelperChannelRef.current) {
        supabaseRealtimeClient.removeChannel(einsatzHelperChannelRef.current);
        einsatzHelperChannelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [session?.user?.id, orgId, queryClient]);

  return { isConnected };
}
