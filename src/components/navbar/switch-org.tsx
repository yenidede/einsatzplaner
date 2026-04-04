'use client';
import * as React from 'react';
import type { OrganizationBasicVisualize } from '@/features/organization/types';
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

type Props = {
  organizations: OrganizationBasicVisualize[];
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
  const [activeOrgId, setActiveOrgId] = React.useState<string>('');
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

    await switchOrganization(orgId);
  };

  return (
    <Select
      value={activeOrgId}
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
            session?.user?.activeOrganization?.name || 'Organisation wählen'
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
