import { useMutation } from '@tanstack/react-query';
import { acceptInvitationAction } from '../invitation-action';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
    onSuccess: async () => {
      if (session?.user) {
        await updateSession({ user: session.user });
      }

      router.push('/');
    },
    onError: async (error: Error) => {
      if (onError) {
        await onError(error);
      }
    },
  });
}
