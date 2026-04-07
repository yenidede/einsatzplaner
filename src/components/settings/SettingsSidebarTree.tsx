'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NAV_ITEMS, type SectionId } from './constants';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from './org-manage-constants';
import { useUserProfile } from '@/features/settings/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import {
  findOrganizationById,
  getOrganizationSettingsHref,
  hasActiveOrganizationSettingsAccess,
  isOrganizationSettingsPath,
  isUserSettingsPath,
} from './settings-navigation.utils';

export interface SettingsSidebarTreeProps {
  currentOrgId?: string;
  onOrgSectionChange?: (sectionId: OrgManageSectionId) => void;
  onUserSectionChange?: (sectionId: SectionId) => void;
  onNavigate?: (url: string) => void | Promise<void>;
}

interface SidebarSectionProps {
  id: string;
  title: string;
  description?: string;
  expanded: boolean;
  onSelect: () => void;
  children?: ReactNode;
}

function SidebarSection({
  id,
  title,
  description,
  expanded,
  onSelect,
  children,
}: SidebarSectionProps) {
  return (
    <section className="space-y-2">
      <Button
        type="button"
        aria-controls={`${id}-panel`}
        aria-expanded={expanded}
        variant={expanded ? 'secondary' : 'ghost'}
        className="h-auto w-full items-start justify-between px-3 py-3 text-left"
        onClick={onSelect}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{title}</span>
          {description ? (
            <span className="text-muted-foreground mt-1 block truncate text-xs">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronRight
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 transition-transform',
            expanded && 'rotate-90'
          )}
        />
      </Button>

      {expanded ? (
        <div id={`${id}-panel`} className="space-y-1 pl-2">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function SettingsSidebarTree({
  currentOrgId,
  onOrgSectionChange,
  onUserSectionChange,
  onNavigate,
}: SettingsSidebarTreeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: userProfile } = useUserProfile(session?.user?.id);
  const activeOrganizationId =
    currentOrgId ?? session?.user?.activeOrganization?.id;
  const activeOrganization = findOrganizationById(
    userProfile?.organizations ?? [],
    activeOrganizationId
  );
  const showOrganizationSection = hasActiveOrganizationSettingsAccess(
    userProfile?.organizations ?? [],
    activeOrganizationId
  );
  const personalExpanded = isUserSettingsPath(pathname);
  const organizationExpanded = isOrganizationSettingsPath(pathname);

  const navigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
      return;
    }

    router.push(url);
  };

  return (
    <nav
      className="sticky top-44 max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto pr-2"
      aria-label="Einstellungen Navigation"
    >
      <SidebarSection
        id="personal-settings"
        title="Persönliche Einstellungen"
        expanded={personalExpanded}
        onSelect={() => navigate('/settings/user')}
      >
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              if (onUserSectionChange) {
                onUserSectionChange(item.id);
                return;
              }

              navigate(`/settings/user#${item.id}`);
            }}
          >
            {item.label}
          </Button>
        ))}
      </SidebarSection>

      {showOrganizationSection && activeOrganizationId && activeOrganization ? (
        <>
          <Separator />
          <SidebarSection
            id="organization-settings"
            title="Organisationseinstellungen"
            description={`Aktive Organisation: ${activeOrganization.name}`}
            expanded={organizationExpanded}
            onSelect={() =>
              navigate(getOrganizationSettingsHref(activeOrganizationId))
            }
          >
            {ORG_MANAGE_NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  if (onOrgSectionChange) {
                    onOrgSectionChange(item.id);
                    return;
                  }

                  navigate(
                    `${getOrganizationSettingsHref(activeOrganizationId)}#${item.id}`
                  );
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </SidebarSection>
        </>
      ) : null}

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
