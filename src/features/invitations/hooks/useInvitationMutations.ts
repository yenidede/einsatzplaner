import { useMutation } from '@tanstack/react-query';
import { acceptInvitationAction } from '../invitation-action';
import { useRouter } from 'next/navigation';

export function useAcceptInvitation(
  token: string,
  onError?: (error: Error) => void | Promise<void>
) {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      return await acceptInvitationAction(token);
    },
    onSuccess: () => {
      router.push('/');
    },
    onError: async (error: Error) => {
      if (onError) {
        await onError(error);
      }
    },
  });
}
