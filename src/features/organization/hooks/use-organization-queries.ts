import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/organization/queryKeys';
import { getOrganizationsByIds } from '@/features/organization/org-dal';
import {
  getOrganizationDetailsAction,
  getOrganizationAddressesAction,
  getOrganizationBankAccountsAction,
} from '@/features/settings/organization-action';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';

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

export function useOrganizationDetails(organizationId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.org.details(organizationId ?? ''),
    queryFn: () => getOrganizationDetailsAction(organizationId ?? ''),
    enabled: !!organizationId,
  });
}

export function useOrganizationAddresses(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-addresses', organizationId],
    queryFn: () => getOrganizationAddressesAction(organizationId ?? ''),
    enabled: !!organizationId,
  });
}

export function useOrganizationBankAccounts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-bank-accounts', organizationId],
    queryFn: () => getOrganizationBankAccountsAction(organizationId ?? ''),
    enabled: !!organizationId,
  });
}
