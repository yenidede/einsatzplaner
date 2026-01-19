import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/organization/queryKeys';
import { getOrganizationsByIds } from '@/features/organization/org-dal';

export function useOrganizations(orgIds: string[] | null | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations(orgIds ?? []),
    queryFn: () => getOrganizationsByIds(orgIds ?? []),
    enabled: !!orgIds?.length,
  });
}

export function useOrganization(orgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.organization(orgId ?? ''),
    queryFn: () => getOrganizationsByIds([orgId ?? '']).then((orgs) => orgs[0]),
    enabled: !!orgId,
  });
}
