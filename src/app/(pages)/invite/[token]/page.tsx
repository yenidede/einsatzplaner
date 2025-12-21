"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import {
  acceptInvitationAction,
  verifyInvitationAction,
} from "@/features/invitations/invitation-action";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  helperNameSingular?: string;
  helperNamePlural?: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { data: session, status: sessionStatus } = useSession();
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery<InvitationData>({
    queryKey: ["invitation", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await verifyInvitationAction(token);
      return res;
    },
    retry: false,
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

  const handleAcceptClick = async () => {
    if (!session?.user) {
      return;
    }

    // Prüfen ob E-Mail übereinstimmt
    if (session.user.email !== invitation?.email) {
      await showDialog({
        title: "E-Mail stimmt nicht überein",
        description: `Diese Einladung ist für ${invitation?.email}, aber Sie sind als ${session.user.email} angemeldet. Bitte melden Sie sich mit der richtigen E-Mail-Adresse an.`,
        confirmText: "OK",
        variant: "destructive",
      });
      return;
    }

    acceptMutation.mutate();
  };

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="grow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"></div>
          <p className="mt-4">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grow flex items-center justify-center">
        <div className="max-w-md w-full rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">
            Einladung nicht gefunden ❌
          </h1>
          <p className="mb-4">
            {(error as Error).message ||
              "Diese Einladung ist ungültig, abgelaufen oder wurde bereits verwendet."}
          </p>
          <Button asChild variant={"default"}>
            <Link href="/signin">Bei bestehendem Konto anmelden</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const callbackUrl = `/invite/${token}`;
  const isWrongMail = !!session && session.user.email !== invitation.email;
  if (isWrongMail) {
    toast.error(
      <div>
        Einladung ist gültig für <b>{invitation.email}</b>.<br></br> Bitte
        zuerst von <b>{session.user.email}</b>{" "}
        <button
          onClick={() => signOut({ callbackUrl })}
          className="bold underline cursor-pointer"
        >
          abmelden
        </button>{" "}
        und erneut versuchen.
      </div>,
      { duration: Number.POSITIVE_INFINITY, id: "wrong-mail-invite-toast" }
    );
  }

  return (
    <>
      {AlertDialogComponent}
      <div className="grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="text-center">
              <h2 className="text-3xl font-extrabold">Einladung annehmen?</h2>
              <p className="mt-2 text-sm">
                Möchten Sie der Organisation{" "}
                <strong>{invitation.organizationName}</strong> beitreten?
              </p>
            </div>
          </div>

          <div className="p-6 rounded-lg shadow-md">
            <div className="mb-6 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Einladungsdetails:</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">E-Mail:</span>
                  <span className="text-sm">{invitation.email}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Organisation:</span>
                  <span className="text-sm">{invitation.organizationName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">
                    {invitation.roles && invitation.roles.length > 1
                      ? "Rollen:"
                      : "Rolle:"}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {invitation.roles && invitation.roles.length > 0 ? (
                      invitation.roles.map((role, index) => (
                        <span
                          key={role.id || index}
                          className="text-sm px-2 py-0.5 rounded"
                        >
                          {role.name === "Helfer"
                            ? invitation.helperNameSingular ?? role.name
                            : role.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm">
                        {invitation.roleName || "Helfer"}
                      </span>
                    )}
                  </div>
                </div>
                {invitation.inviterName && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium">Eingeladen von:</span>
                    <span className="text-sm">{invitation.inviterName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Wenn eingeloggt: Akzeptieren-Button */}
            {session?.user ? (
              <div className="space-y-3">
                <Button
                  variant={"default"}
                  onClick={handleAcceptClick}
                  disabled={acceptMutation.isPending || isWrongMail}
                  className="w-full"
                >
                  {acceptMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Wird akzeptiert...
                    </div>
                  ) : (
                    "Einladung akzeptieren"
                  )}
                </Button>
              </div>
            ) : (
              /* Wenn nicht eingeloggt: Login/Signup Optionen */
              <div className="flex flex-col justify-center">
                <Button asChild variant={"default"}>
                  <Link
                    href={`/signup?callbackUrl=${encodeURIComponent(
                      callbackUrl
                    )}`}
                  >
                    Konto erstellen und Organisation beitreten
                  </Link>
                </Button>
                <div className="flex text-sm justify-center items-center gap-1">
                  <div>Ich habe bereits ein Konto.</div>
                  <Button asChild variant={"link"} className="p-0">
                    <Link
                      href={`/signin?callbackUrl=${encodeURIComponent(
                        callbackUrl
                      )}`}
                    >
                      Jetzt anmelden.
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
