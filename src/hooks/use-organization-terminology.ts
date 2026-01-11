import { useMemo } from 'react';
import { organization as Organization } from '@/generated/prisma';

interface PartialOrganization extends Pick<
  Organization,
  | 'id'
  | 'einsatz_name_singular'
  | 'einsatz_name_plural'
  | 'helper_name_singular'
  | 'helper_name_plural'
> {}

interface OrganizationTerminology {
  einsatz_singular: string;
  einsatz_plural: string;
  helper_singular: string;
  helper_plural: string;
}

export function useOrganizationTerminology(
  organizations: PartialOrganization[] | undefined,
  activeOrgId: string | undefined | null
): OrganizationTerminology {
  return useMemo(() => {
    const activeOrg = organizations?.find((org) => org.id === activeOrgId);
    return {
      einsatz_singular: activeOrg?.einsatz_name_singular ?? 'Einsatz',
      einsatz_plural: activeOrg?.einsatz_name_plural ?? 'Einsätze',
      helper_singular: activeOrg?.helper_name_singular ?? 'Helfer:in',
      helper_plural: activeOrg?.helper_name_plural ?? 'Helfer:innen',
    };
  }, [organizations, activeOrgId]);
}
