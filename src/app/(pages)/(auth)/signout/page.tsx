'use client';

import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignOutPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/helferansicht';

  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        redirect: true,
      });

      queryClient.clear();
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  };

  handleSignOut();
  return (
    <div className="bg-secondary flex grow flex-col p-6 md:p-10">
      <h1>Sie werden in Kürze abgemeldet</h1>
      <p>
        Sollte das Abmelden nicht funktionieren, versuchen Sie es in einem
        Moment erneut oder laden Sie die Seite neu (CMD / STRG + SHIFT + R)
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="default" onClick={() => window.location.reload()}>
          Jetzt Seite neu laden
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return <SignOutPage />;
}
