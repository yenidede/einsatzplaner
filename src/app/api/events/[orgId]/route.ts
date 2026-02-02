import { NextRequest } from 'next/server';
import { sseEmitter } from '@/lib/sse/eventEmitter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  ForbiddenError,
  InternalServerError,
  UnauthorizedError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ConnectedMessage {
  type: 'connected';
  orgId: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new UnauthorizedError('User is not authenticated');
  }

  const { orgId } = params;

  if (!session.user.orgIds?.includes(orgId)) {
    return new ForbiddenError('You do not have access to this organization');
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      let keepAliveInterval: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;

      try {
        const connectedMsg: ConnectedMessage = { type: 'connected', orgId };
        const data = encoder.encode(
          `data: ${JSON.stringify(connectedMsg)}\n\n`
        );
        controller.enqueue(data);
      } catch (error) {
        controller.close();
        return new InternalServerError(
          `Error initializing SSE connection: ${error}`
        );
      }

      unsubscribe = sseEmitter.subscribe(orgId, (event) => {
        try {
          const message = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          cleanup();
          return new InternalServerError(`Error sending SSE event: ${error}`);
        }
      });

      keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          cleanup();
          return new InternalServerError(`Error sending keep-alive: ${error}`);
        }
      }, 30000);

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
        } catch (error) {
          // Controller might already be closed
          return;
        }
      };

      req.signal.addEventListener('abort', cleanup);

      (controller as any)._cleanup = cleanup;
    },
    cancel(controller: ReadableStreamDefaultController<Uint8Array>) {
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
      'X-Accel-Buffering': 'no',
    },
  });
}
