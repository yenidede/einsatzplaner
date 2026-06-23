import crypto from 'node:crypto';
import { processNotificationDigestQueue } from '@/features/notification-preferences/notification-email-digest-dal';

function isAuthorized(request: Request, expectedSecret: string): boolean {
  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader) {
    return false;
  }

  const [scheme, token] = authorizationHeader.split(' ', 2);
  if (scheme !== 'Bearer' || !token) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  return handleDigestProcessing(request);
}

export async function GET(request: Request) {
  return handleDigestProcessing(request);
}

async function handleDigestProcessing(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return Response.json(
      {
        error:
          'CRON_SECRET ist nicht konfiguriert. Sammelmail-Verarbeitung ist deaktiviert.',
      },
      { status: 500 }
    );
  }

  const authorizationHeader = request.headers.get('authorization');
  if (!authorizationHeader) {
    return Response.json(
      {
        error: 'Nicht autorisiert.',
      },
      { status: 401 }
    );
  }

  if (!isAuthorized(request, expectedSecret)) {
    return Response.json(
      {
        error: 'Ungültiges Cron-Token.',
      },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam ? Number(limitParam) : Number.NaN;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.floor(parsedLimit)
      : undefined;

  try {
    const result = await processNotificationDigestQueue(
      limit ? { limit } : undefined
    );

    return Response.json({
      success: true,
      queuedItems: result.queuedItems,
      sentItems: result.sentItems,
      skippedItems: result.skippedItems,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unbekannter Fehler bei der Sammelmail-Verarbeitung.',
      },
      { status: 500 }
    );
  }
}
