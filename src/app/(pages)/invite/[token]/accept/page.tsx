'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useInvitationValidation } from '@/features/invitations/hooks/useInvitation';
import { acceptInvitationAction } from '@/features/invitations/invitation-action';

export default function AcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const { data: session, status: sessionStatus } = useSession();
  const {
    data: validationData,
    isLoading,
    error,
  } = useInvitationValidation(token);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const invitation = validationData?.invitation;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push(
        `/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`
      );
    }
  }, [sessionStatus, router, token]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleAcceptClick = async () => {
    if (!invitation || !session?.user?.email || accepting) return;

    if (session.user.email !== invitation.email) {
      setAcceptError('E-Mail-Adressen stimmen nicht überein');
      return;
    }

    setAccepting(true);
    setAcceptError(null);

    try {
      const response = await acceptInvitationAction(token);

      if (!response || !response.success) {
        throw new Error(
          response.message || 'Fehler beim Annehmen der Einladung'
        );
      }

      setSuccess(true);

      timeoutRef.current = setTimeout(() => {
        router.push('/helferansicht');
      }, 2000);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setAccepting(false);
    }
  };

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Lädt...</h1>
        </div>
      </div>
    );
  }

  if (error || !validationData?.valid || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Einladung nicht gefunden
          </h1>
          <p className="mb-6 text-gray-600">
            {validationData?.error ||
              error?.message ||
              'Die Einladung ist ungültig, bereits akzeptiert oder abgelaufen.'}
          </p>
          <button
            onClick={() => router.push('/helferansicht')}
            className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Zur Helferansicht
          </button>
        </div>
      </div>
    );
  }

  if (session?.user?.email && session.user.email !== invitation.email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            Falsche E-Mail-Adresse
          </h1>
          <p className="mb-4 text-gray-600">
            Sie sind als <strong>{session.user.email}</strong> angemeldet.
          </p>
          <p className="mb-6 text-gray-600">
            Diese Einladung ist für <strong>{invitation.email}</strong>.
          </p>
          <button
            onClick={() => router.push('/helferansicht')}
            className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Zur Helferansicht
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-6xl text-green-600">✓</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Erfolgreich beigetreten!
          </h1>
          <p className="mb-6 text-gray-600">Sie werden weitergeleitet...</p>
        </div>
      </div>
    );
  }

  const organizationName = invitation.organizationName || 'Unbekannt';
  const roleName = invitation.roleName || 'Helfer';
  const inviterName = invitation.inviterName || null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Einladung annehmen
          </h1>
          <p className="text-gray-600">
            Möchten Sie der Organisation <strong>{organizationName}</strong>{' '}
            beitreten?
          </p>
        </div>

        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between">
              <span className="font-medium text-gray-600">E-Mail:</span>
              <span className="text-gray-900">{invitation.email}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="font-medium text-gray-600">Organisation:</span>
              <span className="text-gray-900">{organizationName}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="font-medium text-gray-600">Rolle:</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-sm font-medium text-blue-900">
                {roleName}
              </span>
            </div>
            {inviterName && (
              <div className="flex items-start justify-between">
                <span className="font-medium text-gray-600">
                  Eingeladen von:
                </span>
                <span className="text-gray-900">{inviterName}</span>
              </div>
            )}
          </div>
        </div>

        {acceptError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {acceptError}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleAcceptClick}
            disabled={accepting}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {accepting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Wird angenommen...
              </div>
            ) : (
              'Einladung annehmen'
            )}
          </button>

          <button
            onClick={() => router.push('/helferansicht')}
            disabled={accepting}
            className="w-full rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
