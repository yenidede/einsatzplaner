import type { organization as Organization } from '@/generated/prisma';
import { getOrganizationAccessDecision } from '@/features/organization/organization-access';
import { getExpiredOrganizationSupportText } from '@/features/organization/subscription-expired';

export type OrganizationSwitchOption = Pick<
  Organization,
  'id' | 'name' | 'subscription_status' | 'trial_ends_at'
>;

export function getOrganizationSwitchOptionState(
  organization: OrganizationSwitchOption,
  roleNames: string[]
) {
  const accessDecision = getOrganizationAccessDecision(organization);

  if (accessDecision.status !== 'expired') {
    return {
      disabled: false,
      tooltipText: '',
    };
  }

  return {
    disabled: true,
    tooltipText: `Der Zugriff auf ${organization.name} ist abgelaufen. ${getExpiredOrganizationSupportText(roleNames)}`,
  };
}
