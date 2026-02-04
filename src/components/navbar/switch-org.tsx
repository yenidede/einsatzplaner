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
import { setUserActiveOrganization } from '@/features/user/user-dal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Props = {
  organizations: OrganizationBasicVisualize[];
};

export function NavSwitchOrgSelect({ organizations }: Props) {
  const { update: updateSession, data: session } = useSession();
  const [activeOrgId, setActiveOrgId] = React.useState<string>('');

  React.useEffect(() => {
    const id = session?.user?.activeOrganization?.id;
    if (id) setActiveOrgId(id);
  }, [session?.user?.activeOrganization?.id]);

  const handleSetOrg = async (orgId: string) => {
    const previousOrgId = activeOrgId;
    try {
      // UI-State
      setActiveOrgId(orgId);
      const newOrg = organizations.find((o) => o.id === orgId);
      if (!newOrg || !session) {
        throw new Error('Organisation nicht gefunden');
      }
      await Promise.all([
        // database
        setUserActiveOrganization(session?.user.id || '', orgId),
        // session updateSession
        updateSession({
          user: {
            ...session.user,
            activeOrganization: {
              id: newOrg.id,
              name: newOrg.name,
              logo_url: newOrg.logo_url,
            },
          },
        }),
      ]);
      toast.success(
        'Organisation erfolgreich zu ' +
          organizations.find((o) => o.id === orgId)?.name +
          ' gewechselt.'
      );
    } catch (error) {
      toast.error('Fehler beim Wechseln der Organisation: ' + error);
      setActiveOrgId(previousOrgId); // Rollback to previous organization
    }
  };
  return (
    <Select
      value={activeOrgId}
      onValueChange={handleSetOrg}
      name="orgSwitch"
      disabled={organizations.length <= 1}
    >
      <SelectTrigger
        className={cn(
          'w-46 max-md:w-auto max-md:min-w-0',
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

export default NavSwitchOrgSelect;
