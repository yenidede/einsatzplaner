"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useInvitationValidation } from "@/features/invitations/hooks/useInvitation";
import { acceptInvitationAction } from "@/features/invitations/invitation-action";

interface Role {
  id: string;
  name: string;
}

export default function AcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const { data: session, status: sessionStatus } = useSession();
  const { data: invitation, isLoading, error } = useInvitationValidation(token);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/signin?callbackUrl=${encodeURIComponent(`/invite/${token}/accept`)}`
      );
    }
  }, [sessionStatus, router, token]);

  const handleAcceptClick = async () => {
    if (!invitation || !session?.user?.email || accepting) return;

    if (session.user.email !== invitation.email) {
      setAcceptError("E-Mail-Adressen stimmen nicht überein");
      return;
    }

    setAccepting(true);
    setAcceptError(null);

    try {
      const response = await acceptInvitationAction(token);

      if (!response) {
        throw new Error("Fehler beim Annehmen der Einladung");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/helferansicht");
      }, 2000);
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setAccepting(false);
    }
  };

  if (isLoading || sessionStatus === "loading") {
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Einladung nicht gefunden
          </h1>
          <p className="text-gray-600 mb-6">
            {error?.message ||
              "Die Einladung ist ungültig, bereits akzeptiert oder abgelaufen."}
          </p>
          <button
            onClick={() => router.push("/helferansicht")}
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Falsche E-Mail-Adresse
          </h1>
          <p className="text-gray-600 mb-4">
            Sie sind als <strong>{session.user.email}</strong> angemeldet.
          </p>
          <p className="text-gray-600 mb-6">
            Diese Einladung ist für <strong>{invitation.email}</strong>.
          </p>
          <button
            onClick={() => router.push("/helferansicht")}
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Zur Helferansicht
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Erfolgreich beigetreten!
          </h1>
          <p className="text-gray-600 mb-6">Sie werden weitergeleitet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Einladung annehmen
          </h1>
          <p className="text-gray-600">
            Möchten Sie der Organisation{" "}
            <strong>{invitation.organization.name}</strong> beitreten?
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-gray-600 font-medium">E-Mail:</span>
              <span className="text-gray-900">{invitation.email}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-600 font-medium">Organisation:</span>
              <span className="text-gray-900">
                {invitation.organization.name}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-600 font-medium">
                {invitation.roles && invitation.roles.length > 1
                  ? "Rollen:"
                  : "Rolle:"}
              </span>
              <div className="flex flex-col items-end gap-1">
                {invitation.roles && invitation.roles.length > 0 ? (
                  invitation.roles.map((role: Role, index: number) => (
                    <span
                      key={role.id || index}
                      className="text-sm bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium"
                    >
                      {role.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-900">
                    {invitation.role?.name || "Helfer"}
                  </span>
                )}
              </div>
            </div>
            {invitation.inviter && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 font-medium">
                  Eingeladen von:
                </span>
                <span className="text-gray-900">
                  {invitation.inviter.firstname} {invitation.inviter.lastname}
                </span>
              </div>
            )}
          </div>
        </div>

        {acceptError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {acceptError}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleAcceptClick}
            disabled={accepting}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {accepting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Wird angenommen...
              </div>
            ) : (
              "Einladung annehmen"
            )}
          </button>

          <button
            onClick={() => router.push("/helferansicht")}
            disabled={accepting}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
