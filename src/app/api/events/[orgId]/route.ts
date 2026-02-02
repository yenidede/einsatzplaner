import { NextRequest } from 'next/server';
import { sseEmitter, type SSEController } from '@/lib/sse/eventEmitter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
interface ConnectedMessage {
  type: 'connected';
  orgId: string;
}

const MIN_KEEP_ALIVE_MS = 5_000; // 5 seconds
const MAX_KEEP_ALIVE_MS = 5 * 60_000; // 5 minutes
const DEFAULT_KEEP_ALIVE_MS = 30_000; // 30 seconds

const rawKeepAlive = Number(process.env.KEEP_ALIVE_INTERVAL_MS);
const KEEP_ALIVE_INTERVAL_MS = Number.isNaN(rawKeepAlive)
  ? DEFAULT_KEEP_ALIVE_MS
  : Math.max(MIN_KEEP_ALIVE_MS, Math.min(MAX_KEEP_ALIVE_MS, rawKeepAlive));

const MIN_REVALIDATION_MS = 30_000; // 30 seconds
const MAX_REVALIDATION_MS = 10 * 60_000; // 10 minutes
const DEFAULT_REVALIDATION_MS = 2 * 60_000; // 2 minutes

const rawRevalidation = Number(process.env.SSE_SESSION_REVALIDATION_MS);
const SESSION_REVALIDATION_MS = Number.isNaN(rawRevalidation)
  ? DEFAULT_REVALIDATION_MS
  : Math.max(
      MIN_REVALIDATION_MS,
      Math.min(MAX_REVALIDATION_MS, rawRevalidation)
    );

if (process.env.NODE_ENV === 'development') {
  console.log('[SSE Config]', {
    keepAliveMs: KEEP_ALIVE_INTERVAL_MS,
    sessionRevalidationMs: SESSION_REVALIDATION_MS,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response('User is not authenticated', { status: 401 });
  }

  const { orgId } = await params;

  if (!session.user.orgIds?.includes(orgId)) {
    return new Response('You do not have access to this organization', {
      status: 403,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let keepAliveInterval: NodeJS.Timeout | null = null;
      let revalidationInterval: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;

      const cleanup = (): void => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        if (revalidationInterval) {
          clearInterval(revalidationInterval);
          revalidationInterval = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      };

      try {
        const connectedMsg: ConnectedMessage = { type: 'connected', orgId };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(connectedMsg)}\n\n`)
        );
      } catch (error) {
        console.error('[SSE] Error sending initial message:', error);
        cleanup();
        return;
      }

      try {
        unsubscribe = sseEmitter.subscribe(orgId, (event) => {
          try {
            const message = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error('[SSE] Error sending event:', error);
            cleanup();
          }
        });
      } catch (error) {
        console.error('[SSE] Error subscribing to events:', error);
        cleanup();
        return;
      }

      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          console.error('[SSE] Error sending keep-alive:', error);
          cleanup();
        }
      }, KEEP_ALIVE_INTERVAL_MS);

      revalidationInterval = setInterval(async () => {
        try {
          const currentSession = await getServerSession(authOptions);

          if (!currentSession?.user?.id) {
            cleanup();
            return;
          }

          if (!currentSession.user.orgIds?.includes(orgId)) {
            cleanup();
            return;
          }
        } catch (error) {
          console.error('[SSE] Error during session revalidation:', error);
          // Don't close connection on revalidation errors to avoid false positives
          // The connection will be closed on the next failed revalidation or keep-alive
        }
      }, SESSION_REVALIDATION_MS);

      req.signal.addEventListener('abort', cleanup);

      (controller as SSEController)._cleanup = cleanup;
    },
    cancel(controller) {
      const ctrl = controller as SSEController;
      if (ctrl._cleanup) {
        ctrl._cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
