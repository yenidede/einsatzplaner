'use client';

import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NavItem } from './NavItem';
import { ManagedOrgLink } from './ManagedOrgLink';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from './org-manage-constants';
import { useManagedOrganizations } from '@/features/settings/hooks/useUserProfile';
import { useSession } from 'next-auth/react';

interface OrgManageNavProps {
  currentOrgId: string;
  activeSection?: OrgManageSectionId;
  onSectionChange?: (sectionId: OrgManageSectionId) => void;
}

export function OrgManageNav({
  currentOrgId,
  activeSection,
  onSectionChange,
}: OrgManageNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: managedOrgs = [] } = useManagedOrganizations(
    session?.user?.id
  );

  const handleSectionClick = (sectionId: OrgManageSectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    } else {
      router.push(`/organization/${currentOrgId}/manage#${sectionId}`, {
        scroll: false,
      });
    }
  };

  return (
    <nav
      className="sticky top-44 space-y-1"
      aria-label="Organisation Verwaltung Navigation"
    >
      <div className="mb-4">
        <h2 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
          Verwaltung
        </h2>
        {ORG_MANAGE_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeSection === item.id}
            onClick={() => handleSectionClick(item.id)}
          />
        ))}
      </div>

      {managedOrgs.length > 1 && (
        <>
          <Separator className="my-4" />
          <div>
            <h2 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
              Weitere Organisationen
            </h2>
            {managedOrgs
              .filter((org) => org.id !== currentOrgId)
              .map((org) => (
                <ManagedOrgLink key={org.id} org={org} />
              ))}
          </div>
        </>
      )}

      <Separator className="my-4" />
      <Button
        variant="outline"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start"
        onClick={() => signOut()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Ausloggen
      </Button>
    </nav>
  );
}
