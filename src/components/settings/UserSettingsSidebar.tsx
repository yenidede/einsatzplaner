'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NavItem } from './NavItem';
import { ManagedOrgLink } from './ManagedOrgLink';
import { NAV_ITEMS, type SectionId } from './constants';
import { Organization } from '@/features/settings/types';

interface UserSettingsSidebarProps {
  activeSection: SectionId;
  onSectionChange: (sectionId: SectionId) => void;
  managedOrgs: Organization[];
}

export function UserSettingsSidebar({
  activeSection,
  onSectionChange,
  managedOrgs,
}: UserSettingsSidebarProps) {
  return (
    <nav
      className="sticky top-44 space-y-1"
      aria-label="Einstellungen Navigation"
    >
      <div className="mb-4">
        <h2 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
          Persönlich
        </h2>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
          />
        ))}
      </div>

      {managedOrgs.length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <h2 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
              Verwaltung
            </h2>
            {managedOrgs.map((org) => (
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
