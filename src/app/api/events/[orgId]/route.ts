import { NextRequest } from 'next/server';
import { sseEmitter, type SSEController } from '@/lib/sse/eventEmitter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ConnectedMessage {
  type: 'connected';
  orgId: string;
}

const KEEP_ALIVE_INTERVAL_MS = Number(
  process.env.KEEP_ALIVE_INTERVAL_MS || 30000
);

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
      let unsubscribe: (() => void) | null = null;

      const cleanup = (): void => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
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
        // Handle subscription error (e.g., max connections reached)
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
