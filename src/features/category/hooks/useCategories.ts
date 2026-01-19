import { useQuery } from '@tanstack/react-query';
import { getCategoriesByOrgIds } from '../cat-dal';

export function useCategoriesByOrgIds(orgIds: string[]) {
    return useQuery({
        queryKey: ['categories', orgIds],
        queryFn: () => getCategoriesByOrgIds(orgIds),
        enabled: orgIds.length > 0,
    });
}
