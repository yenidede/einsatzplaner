import { useEffect, useRef, useState } from 'react';
import { addMonths, subMonths } from 'date-fns';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatz/queryKeys';
import { supabaseRealtimeClient } from '@/lib/supabase-client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

function getMonthKeysForDate(date: Date): string[] {
  const d = new Date(date);
  return [
    format(d, 'yyyy-MM'),
  ];
}

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
            const monthKeys = getMonthKeysForDate(new Date(start));
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
          filter: `einsatz_id=eq.${orgId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const einsatzId =
            (payload.new as { einsatz_id?: string })?.einsatz_id ||
            (payload.old as { einsatz_id?: string })?.einsatz_id;

          if (orgId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.einsaetzeForCalendarPrefix(orgId),
            });
          }

          if (einsatzId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.detailedEinsatz(einsatzId),
            });
          }
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
