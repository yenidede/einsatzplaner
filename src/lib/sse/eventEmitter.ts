import type { einsatz as Einsatz } from '@/generated/prisma';

type EventType =
  | 'einsatz:created'
  | 'einsatz:updated'
  | 'einsatz:deleted'
  | 'einsatz:assignment';

// Spezifische Event-Daten Typen
export type EinsatzCreatedData = Einsatz;
export type EinsatzUpdatedData = Einsatz;
export type EinsatzDeletedData = { id: string; deleted: true };
export type EinsatzAssignmentData = {
  einsatzId: string;
  userId: string;
  action: 'assigned' | 'unassigned';
};

export type SSEEventData =
  | EinsatzCreatedData
  | EinsatzUpdatedData
  | EinsatzDeletedData
  | EinsatzAssignmentData;

export interface SSEEvent {
  type: EventType;
  data: SSEEventData;
  orgId: string;
}

interface ClientConnection {
  callback: (event: SSEEvent) => void;
  connectedAt: Date;
  lastActivity: Date;
}

interface SSEController extends ReadableStreamDefaultController<Uint8Array> {
  _cleanup?: () => void;
}

class SSEEventEmitter {
  private clients: Map<string, Map<symbol, ClientConnection>> = new Map();
  private readonly maxConnectionsPerOrg: number;
  private readonly staleConnectionTimeoutMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Limits from environment or defaults
    this.maxConnectionsPerOrg = Number(
      process.env.SSE_MAX_CONNECTIONS_PER_ORG || 150
    );
    this.staleConnectionTimeoutMs = Number(
      process.env.SSE_STALE_CONNECTION_TIMEOUT_MS || 5 * 60 * 1000 // 5 minutes
    );

    // Start cleanup interval for stale connections
    if (typeof window === 'undefined') {
      // Server-side only
      this.startCleanupInterval();
    }
  }

  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    let totalCleaned = 0;

    for (const [orgId, connections] of this.clients.entries()) {
      const staleKeys: symbol[] = [];

      for (const [key, conn] of connections.entries()) {
        const timeSinceActivity = now.getTime() - conn.lastActivity.getTime();
        if (timeSinceActivity > this.staleConnectionTimeoutMs) {
          staleKeys.push(key);
        }
      }

      staleKeys.forEach((key) => {
        connections.delete(key);
        totalCleaned++;
      });

      // Remove org if no clients left
      if (connections.size === 0) {
        this.clients.delete(orgId);
      }
    }
  }

  subscribe(orgId: string, callback: (event: SSEEvent) => void): () => void {
    if (!this.clients.has(orgId)) {
      this.clients.set(orgId, new Map());
    }

    const orgClients = this.clients.get(orgId)!;

    // Check connection limit
    if (orgClients.size >= this.maxConnectionsPerOrg) {
      console.warn(
        `[SSEEventEmitter] Max connections (${this.maxConnectionsPerOrg}) reached for org ${orgId}`
      );
      throw new Error(
        `Maximum number of connections (${this.maxConnectionsPerOrg}) reached for this organization`
      );
    }

    // Use Symbol as unique key for this connection
    const connectionKey = Symbol('sse-connection');
    const connection: ClientConnection = {
      callback,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    orgClients.set(connectionKey, connection);

    // Return unsubscribe function
    return () => {
      orgClients.delete(connectionKey);
      if (orgClients.size === 0) {
        this.clients.delete(orgId);
      }
    };
  }

  emit(event: SSEEvent): void {
    const orgClients = this.clients.get(event.orgId);

    if (!orgClients || orgClients.size === 0) {
      console.log(
        `[SSEEventEmitter] No clients connected for org ${event.orgId}`
      );
      return;
    }

    // Update last activity and send to all clients
    const now = new Date();
    orgClients.forEach((connection) => {
      connection.lastActivity = now;
      try {
        connection.callback(event);
      } catch (error) {
        console.error(
          '[SSEEventEmitter] Error calling client callback:',
          error
        );
      }
    });
  }

  getClientCount(orgId: string): number {
    return this.clients.get(orgId)?.size || 0;
  }

  getTotalClientCount(): number {
    let total = 0;
    for (const connections of this.clients.values()) {
      total += connections.size;
    }
    return total;
  }

  getStats(): {
    totalOrganizations: number;
    totalConnections: number;
    connectionsPerOrg: Record<string, number>;
    maxConnectionsPerOrg: number;
  } {
    const connectionsPerOrg: Record<string, number> = {};

    for (const [orgId, connections] of this.clients.entries()) {
      connectionsPerOrg[orgId] = connections.size;
    }

    return {
      totalOrganizations: this.clients.size,
      totalConnections: this.getTotalClientCount(),
      connectionsPerOrg,
      maxConnectionsPerOrg: this.maxConnectionsPerOrg,
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log(
      `[SSEEventEmitter] Shutting down, disconnecting ${this.getTotalClientCount()} clients`
    );
    this.clients.clear();
  }
}

// Global Singleton Pattern für Next.js
declare global {
  // eslint-disable-next-line no-var
  var __sseEmitter: SSEEventEmitter | undefined;
}

export const sseEmitter = global.__sseEmitter ?? new SSEEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  global.__sseEmitter = sseEmitter;
}

// Graceful shutdown handler
if (typeof window === 'undefined') {
  process.on('SIGTERM', () => {
    sseEmitter.shutdown().catch(console.error);
  });
  process.on('SIGINT', () => {
    sseEmitter.shutdown().catch(console.error);
  });
}

export type { SSEController };
