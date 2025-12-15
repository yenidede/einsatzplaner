"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAcceptInvitation } from "../hooks/useInvitation";
import { useSession } from "next-auth/react";

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
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAccept = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Akzeptieren");
      }
      router.push("/helferansicht");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <span className="font-medium">{invitation.role.name}</span>
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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Wird angenommen..." : "Einladung annehmen"}
        </button>

        <button
          onClick={() => router.push("/helferansicht")}
          className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200"
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
