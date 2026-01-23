import prisma from '@/lib/prisma';

export interface PgSSEEvent {
  type:
    | 'einsatz:created'
    | 'einsatz:updated'
    | 'einsatz:deleted'
    | 'einsatz:assignment';
  data: any;
  orgId: string;
}

class PgEventEmitter {
  private listeners: Map<string, Set<(event: PgSSEEvent) => void>> = new Map();

  subscribe(orgId: string, callback: (event: PgSSEEvent) => void): () => void {
    if (!this.listeners.has(orgId)) {
      this.listeners.set(orgId, new Set());
    }
    this.listeners.get(orgId)!.add(callback);
    console.log(
      `[PgEventEmitter] Subscribed to org ${orgId}, total: ${this.getClientCount(orgId)}`
    );

    return () => {
      this.listeners.get(orgId)?.delete(callback);
      if (this.listeners.get(orgId)?.size === 0) {
        this.listeners.delete(orgId);
      }
    };
  }

  async emit(event: PgSSEEvent) {
    console.log(
      `[PgEventEmitter] Emitting ${event.type} for org ${event.orgId}`
    );

    const payload = JSON.stringify(event).replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`NOTIFY einsatz_events, '${payload}'`);

    console.log(
      `[PgEventEmitter] NOTIFY sent, local clients: ${this.getClientCount(event.orgId)}`
    );
  }

  getClientCount(orgId: string): number {
    return this.listeners.get(orgId)?.size || 0;
  }
}

export const pgEventEmitter = new PgEventEmitter();
