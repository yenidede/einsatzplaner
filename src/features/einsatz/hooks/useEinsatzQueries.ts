import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatz/queryKeys';
import { getEinsaetzeData } from '@/components/event-calendar/utils';
import {
  getEinsatzWithDetailsById,
  getEinsaetzeForTableView,
} from '@/features/einsatz/dal-einsatz';
import { getCategoriesByOrgIds } from '@/features/category/cat-dal';
import { toast } from 'sonner';
import type { ETV } from '@/features/einsatz/types';

export function useEinsaetze(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.einsaetze(activeOrgId ?? ''),
    queryFn: () => getEinsaetzeData(activeOrgId),
    enabled: !!activeOrgId,
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
      if (!(res instanceof Response)) return res;
      toast.error('Failed to fetch einsatz details: ' + res.statusText);
    },
    enabled: typeof einsatzId === 'string' && !!einsatzId && isOpen,
  });
}

export function useCategories(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.categories(activeOrgId ?? ''),
    queryFn: () => getCategoriesByOrgIds(activeOrgId ? [activeOrgId] : []),
    enabled: !!activeOrgId,
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

