type EventType =
  | 'einsatz:created'
  | 'einsatz:updated'
  | 'einsatz:deleted'
  | 'einsatz:assignment';

export interface SSEEvent {
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
    return () => {
      this.clients.get(orgId)?.delete(callback);
      if (this.clients.get(orgId)?.size === 0) {
        this.clients.delete(orgId);
      }
    };
  }

  emit(event: SSEEvent) {
    const callbacks = this.clients.get(event.orgId);
    if (callbacks) {
      callbacks.forEach((callback) => callback(event));
    }
  }

  getClientCount(orgId: string): number {
    return this.clients.get(orgId)?.size || 0;
  }
}

// Global Singleton Pattern für Next.js
declare global {
  var __sseEmitter: SSEEventEmitter | undefined;
}

export const sseEmitter = global.__sseEmitter ?? new SSEEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  global.__sseEmitter = sseEmitter;
}
