'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';
import { acceptInvitationAction } from '@/features/invitations/invitation-action';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useState } from 'react';
import SignUpForm, {
  AvailableTab,
} from '@/features/auth/components/acceptAndRegister-Form';
import { useInvitationVerify } from '@/features/invitations/hooks/useInvitationVerify';

interface Role {
  id: string;
  name: string;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { data: session, status: sessionStatus } = useSession();
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const [tab, setTab] = useState<AvailableTab>('accept');

  const {
    data: invitation,
    isLoading,
    error,
  } = useInvitationVerify(token);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await acceptInvitationAction(token);
    },
    onSuccess: () => {
      router.push('/');
    },
    onError: async (error: Error) => {
      await showDialog({
        title: 'Fehler',
        description: error.message,
        confirmText: 'OK',
        variant: 'destructive',
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
        title: 'E-Mail stimmt nicht überein',
        description: `Diese Einladung ist für ${invitation?.email}, aber Sie sind als ${session.user.email} angemeldet. Bitte melden Sie sich mit der richtigen E-Mail-Adresse an.`,
        confirmText: 'OK',
        variant: 'destructive',
      });
      return;
    }

    acceptMutation.mutate();
  };

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="flex grow items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="mt-4">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex grow items-center justify-center">
        <div className="w-full max-w-md rounded-lg p-6 text-center shadow-md">
          <h1 className="mb-2 text-2xl leading-tight! font-bold">
            Einladung kann nicht angenommen werden
          </h1>
          <p className="mb-4">
            {error.message ||
              'Diese Einladung ist ungültig, abgelaufen oder wurde bereits verwendet.'}
          </p>
          <Button asChild variant={'default'}>
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
        zuerst von <b>{session.user.email}</b>{' '}
        <button
          onClick={() => signOut({ callbackUrl })}
          className="bold cursor-pointer underline"
        >
          abmelden
        </button>{' '}
        und erneut versuchen.
      </div>,
      { duration: Number.POSITIVE_INFINITY, id: 'wrong-mail-invite-toast' }
    );
  }

  return (
    <>
      {AlertDialogComponent}
      <div className="flex grow items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <Tabs value={tab} className="space-y-6">
            <TabsContent value="accept">
              <div className="rounded-lg p-6 shadow-md">
                <div className="mb-4 text-center">
                  <h2 className="text-3xl font-extrabold">
                    Einladung annehmen?
                  </h2>
                  <p className="mt-2 text-sm">
                    Möchten Sie der Organisation{' '}
                    <strong>{invitation.organizationName}</strong> beitreten?
                  </p>
                </div>
                <div className="mb-6 rounded-md p-4">
                  <h3 className="mb-2 font-semibold">Einladungsdetails:</h3>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">E-Mail:</span>
                      <span className="text-sm">{invitation.email}</span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Organisation:</span>
                      <span className="text-sm">
                        {invitation.organizationName}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">
                        {invitation.roles && invitation.roles.length > 1
                          ? 'Rollen:'
                          : 'Rolle:'}
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        {invitation.roles && invitation.roles.length > 0 ? (
                          invitation.roles.map((role, index) => (
                            <span
                              key={role.id || index}
                              className="rounded px-2 py-0.5 text-sm"
                            >
                              {role.name === 'Helfer'
                                ? (invitation.helperNameSingular ?? role.name)
                                : role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm">
                            {invitation.roleName || 'Helfer'}
                          </span>
                        )}
                      </div>
                    </div>
                    {invitation.inviterName && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium">
                          Eingeladen von:
                        </span>
                        <span className="text-sm">
                          {invitation.inviterName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wenn eingeloggt: Akzeptieren-Button */}
                {session?.user ? (
                  <div className="space-y-3">
                    <Button
                      variant={'default'}
                      onClick={handleAcceptClick}
                      disabled={acceptMutation.isPending || isWrongMail}
                      className="w-full"
                    >
                      {acceptMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Wird akzeptiert...
                        </div>
                      ) : (
                        'Einladung akzeptieren'
                      )}
                    </Button>
                  </div>
                ) : invitation.userExists ? (
                  <Button asChild variant={'default'} className="w-full">
                    <Link
                      href={`/signin?callbackUrl=${encodeURIComponent(
                        callbackUrl
                      )}`}
                    >
                      Anmelden und anschließend beitreten
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant={'default'}
                    onClick={() => setTab('register1')}
                    className="w-full"
                  >
                    Konto erstellen und Organisation beitreten
                  </Button>
                )}
              </div>
            </TabsContent>
            <SignUpForm
              email={invitation.email}
              invitationId={invitation.id}
              userId={invitation.newUserId}
              tab={tab}
              setTab={setTab}
            ></SignUpForm>
          </Tabs>
        </div>
      </div>
    </>
  );
}
