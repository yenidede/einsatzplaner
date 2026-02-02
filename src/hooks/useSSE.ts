import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatz/queryKeys';
import type { SSEEvent } from '@/lib/sse/eventEmitter';

export function useSSE(orgId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    isMountedRef.current = true;

    if (!orgId || !session?.user?.id) {
      setIsConnected(false);
      return;
    }

    const connect = () => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const eventSource = new EventSource(`/api/events/${orgId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isMountedRef.current) {
          eventSource.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          const data: SSEEvent = JSON.parse(event.data);

          // Invalidate queries based on event type
          switch (data.type) {
            case 'einsatz:created':
            case 'einsatz:updated':
            case 'einsatz:deleted':
            case 'einsatz:assignment':
              queryClient.invalidateQueries({
                queryKey: queryKeys.einsaetze(orgId),
              });
              if (data.data && 'id' in data.data && data.data.id) {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.detailedEinsatz(data.data.id),
                });
              }
              break;
          }
        } catch (error) {
          console.error('[SSE] Error parsing event:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);

        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Only reconnect if component is still mounted
        if (
          !isMountedRef.current ||
          reconnectAttemptsRef.current >= maxReconnectAttempts
        ) {
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error('[SSE] Max reconnection attempts reached');
          }
          return;
        }

        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            reconnectAttemptsRef.current++;
            connect();
          }
        }, delay);
      };
    };

    connect();

    return () => {
      isMountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [session?.user?.id, orgId, queryClient]);

  return { isConnected };
}
