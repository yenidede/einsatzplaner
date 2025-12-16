"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { acceptInvitationAction } from "@/features/invitations/invitation-action";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import Link from "next/link";

interface Role {
  id: string;
  name: string;
}

interface InvitationData {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  organizationName: string;
  roleName: string;
  roles: Role[];
  inviterName: string;
  expiresAt: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["invitation", token],
    enabled: !!token,
    queryFn: async (): Promise<InvitationData> => {
      const res = await fetch(`/api/invitations/verify?token=${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Einladung nicht gefunden");
      }
      return res.json();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await acceptInvitationAction(token);
    },
    onSuccess: () => {
      router.push("/helferansicht");
    },
    onError: async (error: Error) => {
      await showDialog({
        title: "Fehler",
        description: error.message,
        confirmText: "OK",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      await showDialog({
        title: "Passwörter stimmen nicht überein",
        description:
          "Bitte stellen Sie sicher, dass beide Passwörter identisch sind.",
        confirmText: "OK",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      await showDialog({
        title: "Passwort zu kurz",
        description: "Das Passwort muss mindestens 8 Zeichen lang sein.",
        confirmText: "OK",
        variant: "destructive",
      });
      return;
    }

    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Einladung ungültig
          </h1>
          <p className="text-gray-600 mb-4">{(error as Error).message}</p>
          <Link
            href="/signin"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
          >
            Zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {AlertDialogComponent}
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="text-center">
              <div className="text-blue-600 text-6xl mb-4">📧</div>
              <h2 className="text-3xl font-extrabold text-gray-900">
                Einladung annehmen
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Möchten Sie der Organisation{" "}
                <strong>{invitation?.organizationName}</strong> beitreten?
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">
                Einladungsdetails:
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-blue-800 font-medium">
                    E-Mail:
                  </span>
                  <span className="text-sm text-blue-800">
                    {invitation?.email}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-blue-800 font-medium">
                    Organisation:
                  </span>
                  <span className="text-sm text-blue-800">
                    {invitation?.organizationName}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-blue-800 font-medium">
                    {invitation?.roles && invitation.roles.length > 1
                      ? "Rollen:"
                      : "Rolle:"}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {invitation?.roles && invitation.roles.length > 0 ? (
                      invitation.roles.map((role, index) => (
                        <span
                          key={role.id || index}
                          className="text-sm text-blue-800 bg-blue-100 px-2 py-0.5 rounded"
                        >
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-blue-800">
                        {invitation?.roleName || "Helfer"}
                      </span>
                    )}
                  </div>
                </div>
                {invitation?.inviterName && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-blue-800 font-medium">
                      Eingeladen von:
                    </span>
                    <span className="text-sm text-blue-800">
                      {invitation.inviterName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname
                  </label>
                  <input
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={invitation?.firstname || "Vorname"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname
                  </label>
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={invitation?.lastname || "Nachname"}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Passwort wiederholen"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={acceptMutation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {acceptMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Konto wird erstellt...
                  </div>
                ) : (
                  "Einladung annehmen & Konto erstellen"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
