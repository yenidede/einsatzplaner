import { createClient, RealtimeChannel } from '@supabase/supabase-js';

export interface SupabaseSSEEvent {
  type:
    | 'einsatz:created'
    | 'einsatz:updated'
    | 'einsatz:deleted'
    | 'einsatz:assignment';
  data: any;
  orgId: string;
}

class SupabaseEventEmitter {
  private supabase;
  private listeners: Map<string, Set<(event: SupabaseSSEEvent) => void>> =
    new Map();
  private channel: RealtimeChannel | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async init() {
    if (this.channel) return;

    console.log('[SupabaseEventEmitter] Initializing Supabase Realtime...');

    // Lausche auf Changes an der einsatz Tabelle
    this.channel = this.supabase
      .channel('einsatz_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'einsatz',
        },
        (payload) => {
          console.log(
            '[SupabaseEventEmitter] Database change detected:',
            payload
          );

          const orgId =
            (payload.new as any)?.org_id || (payload.old as any)?.org_id;
          if (!orgId) return;

          const eventType =
            payload.eventType === 'INSERT'
              ? 'einsatz:created'
              : payload.eventType === 'UPDATE'
                ? 'einsatz:updated'
                : payload.eventType === 'DELETE'
                  ? 'einsatz:deleted'
                  : 'einsatz:updated';

          const event: SupabaseSSEEvent = {
            type: eventType,
            data: payload.new || payload.old,
            orgId: orgId,
          };

          const callbacks = this.listeners.get(orgId);
          if (callbacks) {
            console.log(
              `[SupabaseEventEmitter] Notifying ${callbacks.size} clients for org ${orgId}`
            );
            callbacks.forEach((cb) => cb(event));
          } else {
            console.log(`[SupabaseEventEmitter] No clients for org ${orgId}`);
          }
        }
      )
      .subscribe((status) => {
        console.log('[SupabaseEventEmitter] Subscription status:', status);
      });

    console.log('[SupabaseEventEmitter] Subscribed to einsatz table changes');
  }

  subscribe(
    orgId: string,
    callback: (event: SupabaseSSEEvent) => void
  ): () => void {
    if (!this.listeners.has(orgId)) {
      this.listeners.set(orgId, new Set());
    }
    this.listeners.get(orgId)!.add(callback);

    console.log(
      `[SupabaseEventEmitter] Client subscribed to org ${orgId}, total: ${this.getClientCount(orgId)}`
    );

    return () => {
      this.listeners.get(orgId)?.delete(callback);
      if (this.listeners.get(orgId)?.size === 0) {
        this.listeners.delete(orgId);
      }
    };
  }

  async emit(event: SupabaseSSEEvent) {
    // Nicht nötig! Supabase sendet automatisch wenn die DB sich ändert
    console.log(
      `[SupabaseEventEmitter] Emit called (handled by Postgres triggers)`
    );
  }

  getClientCount(orgId: string): number {
    return this.listeners.get(orgId)?.size || 0;
  }

  async close() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const supabaseEventEmitter = new SupabaseEventEmitter();

if (typeof window === 'undefined') {
  supabaseEventEmitter.init().catch(console.error);
}
