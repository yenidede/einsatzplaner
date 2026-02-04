// src/app/invite/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDigbizInvitationFromLinkAction } from '@/features/invitations/actions';

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function handleInvite() {
      const token = searchParams.get('token');
      const mode = searchParams.get('m') as 'h' | 'j' | null;
      const org = searchParams.get('org');

      // If token exists, redirect to the existing invite flow
      if (token) {
        router.replace(`/invite/${token}`);
        return;
      }

      // If mode and org exist, mint a new token
      if (mode && org && (mode === 'h' || mode === 'j')) {
        try {
          const result = await createDigbizInvitationFromLinkAction({
            organizationId: org,
            mode,
          });

          // Replace URL with token-based URL
          router.replace(`/invite?token=${result.token}`);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Fehler beim Erstellen der Einladung'
          );
          setIsLoading(false);
        }
      } else {
        setError('Ungültiger Einladungslink');
        setIsLoading(false);
      }
    }

    handleInvite();
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="flex grow items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="mt-4">Einladung wird vorbereitet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex grow items-center justify-center">
        <div className="w-full max-w-md rounded-lg p-6 text-center shadow-md">
          <h1 className="mb-2 text-2xl leading-tight font-bold">Fehler</h1>
          <p className="mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}
