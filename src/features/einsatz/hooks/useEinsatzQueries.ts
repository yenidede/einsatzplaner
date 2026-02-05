import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { queryKeys } from '@/features/einsatz/queryKeys';
import {
  getEinsaetzeData,
  getEinsaetzeDataForAgenda,
  getEinsaetzeDataForCalendarRange,
} from '@/components/event-calendar/utils';
import type { CalendarRangeData } from '@/components/event-calendar/utils';
import {
  getEinsatzWithDetailsById,
  getEinsaetzeForTableView,
} from '@/features/einsatz/dal-einsatz';
import { getCategoriesByOrgIds } from '@/features/category/cat-dal';
import type { ETV } from '@/features/einsatz/types';

export function useEinsaetze(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.einsaetze(activeOrgId ?? ''),
    queryFn: () => getEinsaetzeData(activeOrgId),
    enabled: !!activeOrgId,
  });
}

const calendarRangeQueryFn = async (
  activeOrgId: string | undefined,
  focusDate: Date
): Promise<CalendarRangeData> => {
  const result = await getEinsaetzeDataForCalendarRange(
    activeOrgId,
    focusDate
  );
  if (result instanceof Response) {
    throw new Error(`Einsätze konnten nicht geladen werden: ${result.statusText}`);
  }
  return result;
};

export function useEinsaetzeForCalendar(
  activeOrgId: string | null | undefined,
  focusDate: Date
) {
  const monthKey = format(focusDate, 'yyyy-MM');
  return useQuery<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForCalendar(activeOrgId ?? '', monthKey),
    queryFn: () =>
      calendarRangeQueryFn(activeOrgId ?? undefined, focusDate),
    enabled: !!activeOrgId,
  });
}

/** Prefetch a calendar month's 3-month window (e.g. for adjacent-month navigation). */
export function usePrefetchEinsaetzeForCalendar(
  activeOrgId: string | null | undefined
) {
  const queryClient = useQueryClient();
  return useCallback(
    (focusDate: Date) => {
      if (!activeOrgId) return;
      const monthKey = format(focusDate, 'yyyy-MM');
      queryClient.prefetchQuery({
        queryKey: queryKeys.einsaetzeForCalendar(activeOrgId, monthKey),
        queryFn: () =>
          calendarRangeQueryFn(activeOrgId, focusDate),
      });
    },
    [activeOrgId, queryClient]
  );
}

const agendaQueryFn = async (
  activeOrgId: string | undefined
): Promise<CalendarRangeData> => {
  const result = await getEinsaetzeDataForAgenda(activeOrgId);
  if (result instanceof Response) {
    throw new Error(`Einsätze konnten nicht geladen werden: ${result.statusText}`);
  }
  return result;
};

/** All future events for agenda view. Invalidated with einsaetzeForCalendarPrefix(orgId). */
export function useEinsaetzeForAgenda(
  activeOrgId: string | null | undefined,
  enabled: boolean
) {
  return useQuery<CalendarRangeData>({
    queryKey: queryKeys.einsaetzeForAgenda(activeOrgId ?? ''),
    queryFn: () => agendaQueryFn(activeOrgId ?? undefined),
    enabled: !!activeOrgId && enabled,
  });
}

export function useDetailedEinsatz(
  einsatzId: string | null | undefined,
  isOpen: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.detailedEinsatz(einsatzId as string),
    queryFn: async () => {
      const res = await getEinsatzWithDetailsById(einsatzId as string);
      if (res instanceof Response) {
        throw new Error(
          `Einsatz konnte nicht geladen werden: ${res.statusText}`
        );
      }
      return res;
    },
    enabled: typeof einsatzId === 'string' && !!einsatzId && isOpen,
    retry: false,
  });
}

export function usePrefetchDetailedEinsatz() {
  const queryClient = useQueryClient();
  return useCallback((einsatzId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.detailedEinsatz(einsatzId),
      queryFn: async () => {
        const res = await getEinsatzWithDetailsById(einsatzId);
        if (res instanceof Response) {
          throw new Error(
            `Einsatz konnte nicht geladen werden: ${res.statusText}`
          );
        }
        return res;
      },
      retry: false,
    });
  }, [queryClient]);
}

export function useCategories(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.categories(activeOrgId ?? ''),
    queryFn: () => getCategoriesByOrgIds(activeOrgId ? [activeOrgId] : []),
    enabled: !!activeOrgId,
  });
}

/** Categories for multiple orgs (e.g. list view showing events from all user orgs). */
export function useCategoriesByOrgIds(orgIds: string[] | null | undefined) {
  return useQuery({
    queryKey: queryKeys.categoriesByOrgIds(orgIds ?? []),
    queryFn: () => getCategoriesByOrgIds(orgIds ?? []),
    enabled: !!orgIds && orgIds.length > 0,
  });
}

export function useEinsaetzeTableView(userOrgIds: string[] | null | undefined) {
  return useQuery<ETV[]>({
    queryKey: [...queryKeys.einsaetzeTableView(userOrgIds ?? [])],
    queryFn: () => getEinsaetzeForTableView(userOrgIds ?? []),
    placeholderData: (previousData) => previousData ?? [],
    enabled: !!userOrgIds && userOrgIds.length > 0,
  });
}
