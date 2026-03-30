import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatz/queryKeys';
import { getEinsatzRealtimeMetadataById } from '@/features/einsatz/dal-einsatz';
import { supabaseRealtimeClient } from '@/lib/supabase-client';
import { getMonthKeysForDate } from '@/features/einsatz/hooks/useEinsatzMutations';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

type EinsatzPayload = RealtimePostgresChangesPayload<{
  id: string;
  org_id: string;
  start?: string;
  end?: string;
  [key: string]: unknown;
}>;

type EinsatzHelperPayload = RealtimePostgresChangesPayload<{
  einsatz_id: string;
  [key: string]: unknown;
}>;

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

function invalidateEinsatzListQueriesForOrg(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.einsaetzeListPrefix(),
    predicate: (query) => matchesEinsatzListQueryForOrg(query.queryKey, orgId),
  });
}

export function useSupabaseRealtime(orgId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!orgId || !session?.user?.id) {
      setIsConnected(false);
      return;
    }

    const channelName = `org-changes:${orgId}:${Date.now()}`;
    const channel = supabaseRealtimeClient.channel(channelName);

    channelRef.current = channel;

    channel
      .on<EinsatzPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'einsatz',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const record = (payload.new as { start?: string }) ?? (payload.old as { start?: string });
          const start = record?.start;
          if (orgId && start) {
            const monthKeys = getMonthKeysForDate(new Date(start), false);
            monthKeys.forEach((monthKey) => {
              queryClient.invalidateQueries({
                queryKey: queryKeys.einsaetzeForCalendar(orgId, monthKey),
              });
            });
          } else if (orgId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
            });
          }
          queryClient.invalidateQueries({
            queryKey: queryKeys.einsaetzeForAgenda(orgId),
          });
          invalidateEinsatzListQueriesForOrg(queryClient, orgId);

          const einsatzId =
            (payload.new as { id?: string })?.id ||
            (payload.old as { id?: string })?.id;
          if (einsatzId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.detailedEinsatz(einsatzId),
            });
          }
        }
      )
      .on<EinsatzHelperPayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'einsatz_helper',
        },
        async (payload) => {
          if (!isMountedRef.current) return;

          const einsatzId =
            (payload.new as { einsatz_id?: string })?.einsatz_id ||
            (payload.old as { einsatz_id?: string })?.einsatz_id;
          if (!einsatzId || !orgId) return;

          const einsatz = await getEinsatzRealtimeMetadataById(einsatzId);
          if (!isMountedRef.current) return;
          if (!einsatz || einsatz instanceof Response || einsatz.org_id !== orgId) {
            return;
          }

          const monthKeys = getMonthKeysForDate(einsatz.start, false);
          monthKeys.forEach((monthKey) => {
            queryClient.invalidateQueries({
              queryKey: queryKeys.einsaetzeForCalendar(orgId, monthKey),
            });
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.einsaetzeForAgenda(orgId),
          });
          invalidateEinsatzListQueriesForOrg(queryClient, orgId);

          queryClient.invalidateQueries({
            queryKey: queryKeys.detailedEinsatz(einsatzId),
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabaseRealtimeClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [session?.user?.id, orgId, queryClient]);

  return { isConnected };
}
