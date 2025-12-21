"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignOutPage() {
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

  handleSignOut();
  return <div>Abmeldung läuft...</div>;
}
