'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useInvitationValidation } from '@/features/invitations/hooks/useInvitation';

export default function AcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  
  const { data: session, status: sessionStatus } = useSession();
  const { data: invitation, isLoading, error } = useInvitationValidation(token);
  
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push(`/signin?callbackUrl=${encodeURIComponent(`/invite/${token}/accept`)}`);
    }
  }, [sessionStatus, router, token]);

  useEffect(() => {
    if (!invitation || !session?.user?.email || accepting) return;

    if (session.user.email !== invitation.email) {
      return;
    }

    const acceptInvitation = async () => {
      setAccepting(true);
      try {
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Fehler beim Akzeptieren');
        }

        setTimeout(() => {
          router.push('/helferansicht');
        }, 2000);
      } catch (err) {
        setAcceptError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        setAccepting(false);
      }
    };

    acceptInvitation();
  }, [invitation, session, accepting, token, router]);

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lädt...</h1>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Einladung nicht gefunden</h1>
          <p className="text-gray-600 mb-6">
            {error?.message || 'Die Einladung ist ungültig, bereits akzeptiert oder abgelaufen.'}
          </p>
          <button
            onClick={() => router.push('/helferansicht')}
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Zur Helferansicht
          </button>
        </div>
      </div>
    );
  }

  if (session?.user?.email && session.user.email !== invitation.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Falsche E-Mail-Adresse</h1>
          <p className="text-gray-600 mb-4">
            Sie sind als <strong>{session.user.email}</strong> angemeldet.
          </p>
          <p className="text-gray-600 mb-4">
            Diese Einladung ist aber für <strong>{invitation.email}</strong>.
          </p>
          <p className="text-gray-600 mb-6">
            Bitte melden Sie sich mit der richtigen E-Mail-Adresse an.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/signout?callbackUrl=${encodeURIComponent(`/invite/${token}/accept`)}`)}
              className="block w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium"
            >
              Abmelden und richtige E-Mail verwenden
            </button>
            <button
              onClick={() => router.push('/helferansicht')}
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (acceptError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler</h1>
          <p className="text-gray-600 mb-6">{acceptError}</p>
          <button
            onClick={() => router.push('/helferansicht')}
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Zur Helferansicht
          </button>
        </div>
      </div>
    );
  }

  if (accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Einladung wird angenommen...
          </h1>
          <p className="text-gray-600">Bitte warten Sie einen Moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Einladung angenommen!
        </h1>
        <p className="text-gray-600 mb-2">
          Sie sind jetzt Mitglied der Organisation
        </p>
        <p className="text-lg font-semibold text-blue-600 mb-6">
          {invitation.organization.name}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Ihre Rolle: {invitation.role?.name}
        </p>
        <p className="text-sm text-gray-400">
          Sie werden automatisch weitergeleitet...
        </p>
      </div>
    </div>
  );
}