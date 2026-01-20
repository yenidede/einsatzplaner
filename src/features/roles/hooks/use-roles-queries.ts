import { useQuery } from '@tanstack/react-query';
import { getAllRoles } from '../roles-dal';
import { queryKeys as rolesQueryKeys } from '../queryKeys';

export function useRoles() {
    return useQuery({
        queryKey: rolesQueryKeys.roles(),
        queryFn: () => getAllRoles(),
        staleTime: 1000 * 60 * 120, // 120 minutes cache
    });
}
