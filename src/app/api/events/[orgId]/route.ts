import { NextRequest } from 'next/server';
import { sseEmitter } from '@/lib/sse/eventEmitter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { orgId } = await params;

  console.log('[SSE Route] Connection request for orgId:', orgId);
  console.log('[SSE Route] User orgIds:', session.user.orgIds);

  if (!session.user.orgIds?.includes(orgId)) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let keepAliveInterval: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;

      try {
        const data = encoder.encode(
          `data: ${JSON.stringify({ type: 'connected', orgId })}\n\n`
        );
        controller.enqueue(data);
        console.log(
          `[SSE Route] Client connected and subscribed to org ${orgId}`
        );
      } catch (error) {
        console.error('Error sending initial message:', error);
        controller.close();
        return;
      }

      unsubscribe = sseEmitter.subscribe(orgId, (event) => {
        console.log(
          `[SSE Route] Sending event to client for org ${orgId}:`,
          event.type
        );
        try {
          const message = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending SSE event:', error);
          cleanup();
        }
      });

      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          console.error('Error sending keep-alive:', error);
          cleanup();
        }
      }, 30000);

      const cleanup = () => {
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
        } catch (error) {
          // Controller might already be closed
        }
      };

      // Cleanup on connection abort
      req.signal.addEventListener('abort', cleanup);

      // Store cleanup function for cancel callback
      (controller as any)._cleanup = cleanup;
    },
    cancel(controller) {
      // Called when the stream is cancelled/closed by the client
      if ((controller as any)._cleanup) {
        (controller as any)._cleanup();
      }
    },
  });

  console.log(
    `[SSE Route] Total clients for org ${orgId}:`,
    sseEmitter.getClientCount(orgId)
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
