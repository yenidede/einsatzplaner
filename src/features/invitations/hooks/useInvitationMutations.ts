import { useMutation } from '@tanstack/react-query';
import { acceptInvitationAction } from '../invitation-action';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function useAcceptInvitation(
  token: string,
  onError?: (error: Error) => void | Promise<void>
) {
  const router = useRouter();
  const { update: updateSession, data: session } = useSession();

  return useMutation({
    mutationFn: async () => {
      return await acceptInvitationAction(token);
    },
    onSuccess: async (response) => {
      try {
        if (session?.user && response?.sessionUpdate?.user) {
          await updateSession({ user: response.sessionUpdate.user });
        }
      } catch (error) {
        console.error('Session konnte nach Einladungsannahme nicht aktualisiert werden:', error);
        toast.error(
          'Ihre Sitzung konnte nicht vollständig aktualisiert werden. Sie werden trotzdem weitergeleitet.'
        );
      } finally {
        router.push('/');
      }
    },
    onError: async (error: Error) => {
      if (onError) {
        await onError(error);
      }
    },
  });
}
