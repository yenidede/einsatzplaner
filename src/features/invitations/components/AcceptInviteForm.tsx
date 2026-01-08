'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitationAction } from '../invitation-action';

interface AcceptInvitationClientProps {
  invitation: {
    id: string;
    email: string;
    organization: {
      name: string;
    };
    role: {
      name: string;
    };
    user: {
      firstname: string | null;
      lastname: string | null;
    };
  };
  token: string;
}

export default function AcceptInvitationClient({
  invitation,
  token,
}: AcceptInvitationClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await acceptInvitationAction(token);
      router.push('/helferansicht');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Einladung annehmen
        </h1>
        <p className="text-gray-600">
          Möchten Sie der Organisation{' '}
          <strong>{invitation.organization.name}</strong> beitreten?
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">E-Mail:</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Organisation:</span>
            <span className="font-medium">{invitation.organization.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Rolle:</span>
            <span className="font-medium">{invitation.organization.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Eingeladen von:</span>
            <span className="font-medium">
              {invitation.user.firstname} {invitation.user.lastname}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Wird angenommen...' : 'Einladung annehmen'}
        </button>

        <button
          onClick={() => router.push('/helferansicht')}
          className="w-full rounded-lg bg-gray-100 px-4 py-3 text-gray-700 hover:bg-gray-200"
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
