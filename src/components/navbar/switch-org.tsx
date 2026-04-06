'use client';
import * as React from 'react';
import type { OrganizationSwitchOption } from '@/components/navbar/switch-org-options';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { requestOrganizationSwitchConfirmation } from '@/components/settings/settings-navigation.utils';
import { useActiveOrganizationSwitch } from '@/hooks/use-active-organization-switch';
import { useUserProfile } from '@/features/settings/hooks/useUserProfile';
import { getOrganizationSwitchOptionState } from '@/components/navbar/switch-org-options';

type Props = {
  organizations: OrganizationSwitchOption[];
};

/**
 * Render a dropdown to switch the user's active organization.
 *
 * Selecting an organization updates the session and persistent user record and
 * optionally asks the settings area to confirm unsaved changes first.
 *
 * @param organizations - Array of available organizations to display in the dropdown
 * @returns The Select component that controls and displays the user's active organization
 */
export function NavSwitchOrgSelect({ organizations }: Props) {
  const { data: session } = useSession();
  const { data: userProfile } = useUserProfile(session?.user?.id);
  const [activeOrgId, setActiveOrgId] = React.useState<string>('');
  const [pendingOrgId, setPendingOrgId] = React.useState<string | null>(null);
  const { isSwitching, switchOrganization } = useActiveOrganizationSwitch();

  React.useEffect(() => {
    const id = session?.user?.activeOrganization?.id;
    if (id) setActiveOrgId(id);
  }, [session?.user?.activeOrganization?.id]);

  const handleSetOrg = async (orgId: string) => {
    if (!session || orgId === activeOrgId) {
      return;
    }

    const canContinue = await requestOrganizationSwitchConfirmation();

    if (!canContinue) {
      return;
    }

    setPendingOrgId(orgId);
    try {
      await switchOrganization(orgId);
    } catch {
      return;
    } finally {
      setPendingOrgId(null);
    }
  };

  const selectedOrgId =
    isSwitching && pendingOrgId ? pendingOrgId : activeOrgId;

  return (
    <Select
      value={selectedOrgId}
      onValueChange={handleSetOrg}
      name="orgSwitch"
      disabled={organizations.length <= 1 || isSwitching}
    >
      <SelectTrigger
        className={cn(
          'w-46 min-w-0 text-left max-md:w-auto max-md:min-w-0 [&>span]:text-left',
          organizations.length <= 1 && 'max-md:hidden'
        )}
      >
        <SelectValue
          placeholder={
            session?.user?.activeOrganization?.name || 'Organisation waehlen'
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {organizations.map((org) => {
            const roleNames =
              userProfile?.organizations
                ?.find((organization) => organization.id === org.id)
                ?.roles.map((role) => role.name) ?? [];
            const optionState = getOrganizationSwitchOptionState(
              org,
              roleNames
            );

            return (
              <SelectItem
                key={org.id}
                value={org.id}
                disabled={optionState.disabled}
                title={optionState.tooltipText}
                className="data-disabled:pointer-events-auto"
              >
                {org.name}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
