"use client";

import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

async function SignOutPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/helferansicht";

  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        redirect: true,
      });

      queryClient.clear();
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
    }
  };

  await handleSignOut();
  return (
    <div className="bg-secondary flex grow flex-col p-6 md:p-10">
      <h1>Abmeldung fehlgeschlagen</h1>
      <p>
        Leider hat das Abmelden gerade nicht funktioniert. Bitte versuchen Sie
        es in einem Moment erneut oder laden Sie die Seite neu (CMD / STRG +
        SHIFT + R)
      </p>
      <div className="flex mt-4 gap-2">
        <Button variant="default" onClick={() => window.location.reload()}>
          Seite neu laden
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Abmeldung läuft...</div>}>
      <SignOutPage />
    </Suspense>
  );
}
