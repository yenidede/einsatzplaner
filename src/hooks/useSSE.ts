// src/hooks/useSSE.ts
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatz/queryKeys';

interface SSEEvent {
  type:
    | 'connected'
    | 'einsatz:created'
    | 'einsatz:updated'
    | 'einsatz:deleted'
    | 'einsatz:assignment';
  data?: any;
  orgId?: string;
}

export function useSSE(orgId?: string) {
  console.log('[useSSE] Hook called with orgId:', orgId);

  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    console.log('[useSSE] Effect triggered', {
      orgId,
      hasSession: !!session?.user?.id,
    });

    if (!orgId || !session?.user?.id) {
      console.log('[useSSE] Skipping connection - missing orgId or session');
      setIsConnected(false);
      return;
    }

    const connect = () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      console.log(`[useSSE] Connecting to /api/events/${orgId}...`);
      const eventSource = new EventSource(`/api/events/${orgId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
      };

      eventSource.onmessage = (event) => {
        console.log('[SSE] Raw event received:', event.data);
        try {
          const data: SSEEvent = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log('[SSE] Connected to SSE stream for org:', data.orgId);
            return;
          }

          console.log('[SSE] Received event:', data.type, data);
          console.log('[SSE] Invalidating queries for orgId:', orgId);
          console.log('[SSE] Event data:', JSON.stringify(data, null, 2));

          // Invalidate queries based on event type
          switch (data.type) {
            case 'einsatz:created':
            case 'einsatz:updated':
            case 'einsatz:deleted':
            case 'einsatz:assignment':
              queryClient.invalidateQueries({
                queryKey: queryKeys.einsaetze(orgId),
              });
              if (data.data?.id) {
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

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error - full error object:', error);
        console.error('[SSE] EventSource readyState:', eventSource.readyState);
        console.error('[SSE] EventSource url:', eventSource.url);
        setIsConnected(false);

        // Close the connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(
            `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max reconnection attempts reached');
        }
      };
    };

    connect();

    return () => {
      console.log('[SSE] Cleaning up connection...');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
    };
  }, [orgId, queryClient]);

  return { isConnected };
}
