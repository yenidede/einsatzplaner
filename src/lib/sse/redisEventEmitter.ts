import Redis from 'ioredis';

export interface RedisSSEEvent {
  type:
    | 'einsatz:created'
    | 'einsatz:updated'
    | 'einsatz:deleted'
    | 'einsatz:assignment';
  data: any;
  orgId: string;
}

class RedisEventEmitter {
  private publisher: Redis;
  private subscriber: Redis;
  private listeners: Map<string, Set<(event: RedisSSEEvent) => void>> =
    new Map();
  private isInitialized = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async init() {
    if (this.isInitialized) return;

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'einsatz_events') {
        try {
          const event: RedisSSEEvent = JSON.parse(message);
          console.log(
            `[RedisEventEmitter] Received event ${event.type} for org ${event.orgId}`
          );

          const callbacks = this.listeners.get(event.orgId);
          if (callbacks) {
            console.log(
              `[RedisEventEmitter] Notifying ${callbacks.size} clients`
            );
            callbacks.forEach((cb) => cb(event));
          }
        } catch (error) {
          console.error('[RedisEventEmitter] Error parsing message:', error);
        }
      }
    });

    await this.subscriber.subscribe('einsatz_events');
    this.isInitialized = true;
    console.log(
      '[RedisEventEmitter] Subscribed to Redis channel: einsatz_events'
    );
  }

  subscribe(
    orgId: string,
    callback: (event: RedisSSEEvent) => void
  ): () => void {
    if (!this.listeners.has(orgId)) {
      this.listeners.set(orgId, new Set());
    }
    this.listeners.get(orgId)!.add(callback);

    console.log(
      `[RedisEventEmitter] Client subscribed to org ${orgId}, total: ${this.getClientCount(orgId)}`
    );

    return () => {
      this.listeners.get(orgId)?.delete(callback);
      if (this.listeners.get(orgId)?.size === 0) {
        this.listeners.delete(orgId);
      }
      console.log(`[RedisEventEmitter] Client unsubscribed from org ${orgId}`);
    };
  }

  async emit(event: RedisSSEEvent) {
    if (!this.isInitialized) {
      await this.init();
    }

    console.log(
      `[RedisEventEmitter] Publishing ${event.type} for org ${event.orgId}`
    );

    const message = JSON.stringify(event);
    await this.publisher.publish('einsatz_events', message);

    console.log(
      `[RedisEventEmitter] Published to Redis, local clients: ${this.getClientCount(event.orgId)}`
    );
  }

  getClientCount(orgId: string): number {
    return this.listeners.get(orgId)?.size || 0;
  }

  async close() {
    await this.subscriber.quit();
    await this.publisher.quit();
    this.isInitialized = false;
  }
}

export const redisEventEmitter = new RedisEventEmitter();

// Initialize on module load (server-side only)
if (typeof window === 'undefined') {
  redisEventEmitter.init().catch(console.error);
}
