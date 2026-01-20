import { useQuery } from '@tanstack/react-query';
import { invitationQueryKeys } from '../queryKeys';
import { verifyInvitationAction } from '../invitation-action';

export function useInvitationVerify(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await verifyInvitationAction(token);
      return res;
    },
    retry: false,
  });
}
