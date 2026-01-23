export { redisEventEmitter as sseEmitter } from './redisEventEmitter';
export type { RedisSSEEvent as SSEEvent } from './redisEventEmitter';

/* export { supabaseEventEmitter as sseEmitter } from './supabaseEventEmitter';
export type { SupabaseSSEEvent as SSEEvent } from './supabaseEventEmitter'; */
type EventType =
  | 'einsatz:created'
  | 'einsatz:updated'
  | 'einsatz:deleted'
  | 'einsatz:assignment';

interface SSEEvent {
  type: EventType;
  data: any;
  orgId: string;
}

class SSEEventEmitter {
  private clients: Map<string, Set<(event: SSEEvent) => void>> = new Map();

  subscribe(orgId: string, callback: (event: SSEEvent) => void): () => void {
    if (!this.clients.has(orgId)) {
      this.clients.set(orgId, new Set());
    }
    this.clients.get(orgId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.clients.get(orgId)?.delete(callback);
      if (this.clients.get(orgId)?.size === 0) {
        this.clients.delete(orgId);
      }
    };
  }

  emit(event: SSEEvent) {
    console.log(
      `[SSE Emitter] Emitting event type: ${event.type} for org: ${event.orgId}`
    );
    const callbacks = this.clients.get(event.orgId);
    console.log(
      `[SSE Emitter] Found ${callbacks?.size || 0} clients for org ${event.orgId}`
    );
    if (callbacks) {
      callbacks.forEach((callback) => callback(event));
    } else {
      console.log(`[SSE Emitter] No clients subscribed for org ${event.orgId}`);
    }
  }

  getClientCount(orgId: string): number {
    return this.clients.get(orgId)?.size || 0;
  }
}

//export const sseEmitter = new SSEEventEmitter();
