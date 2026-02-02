// src/hooks/useSupabaseRealtime.ts
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatz/queryKeys';
import { supabaseRealtimeClient } from '@/lib/supabase-client'; // GEÄNDERT
import type { RealtimeChannel } from '@supabase/supabase-js';

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
    const channel = supabaseRealtimeClient.channel(channelName); // GEÄNDERT

    channelRef.current = channel;

    channel
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'einsatz',
          filter: `org_id=eq.${orgId}`,
        } as any,
        (payload: any) => {
          if (!isMountedRef.current) return;

          queryClient.invalidateQueries({
            queryKey: queryKeys.einsaetze(orgId),
          });

          const einsatzId = payload.new?.id || payload.old?.id;
          if (einsatzId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.detailedEinsatz(einsatzId),
            });
          }
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'einsatz_helper',
        } as any,
        (payload: any) => {
          if (!isMountedRef.current) return;

          const einsatzId = payload.new?.einsatz_id || payload.old?.einsatz_id;

          queryClient.invalidateQueries({
            queryKey: queryKeys.einsaetze(orgId),
          });

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
        supabaseRealtimeClient.removeChannel(channelRef.current); // GEÄNDERT
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [session?.user?.id, orgId, queryClient]);

  return { isConnected };
}
