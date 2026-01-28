'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NavItem } from './NavItem';
import { NAV_ITEMS, type SectionId } from './constants';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from './org-manage-constants';
import { useManagedOrganizations } from '@/features/settings/hooks/useUserProfile';
import Link from 'next/link';

interface SettingsPageLayoutProps {
  header: ReactNode;
  mobileNav?: ReactNode;
  children: ReactNode;
  // For user settings page
  activeUserSection?: SectionId;
  onUserSectionChange?: (sectionId: SectionId) => void;
  // For org settings page
  currentOrgId?: string;
  activeOrgSection?: OrgManageSectionId;
  onOrgSectionChange?: (sectionId: OrgManageSectionId) => void;
}

export function SettingsPageLayout({
  header,
  mobileNav,
  children,
  activeUserSection,
  onUserSectionChange,
  currentOrgId,
  activeOrgSection,
  onOrgSectionChange,
}: SettingsPageLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: managedOrgs = [] } = useManagedOrganizations(session?.user?.id);

  const isUserSettingsPage = pathname === '/settings/user';
  const isOrgSettingsPage = pathname?.startsWith('/settings/org/');

  const handleOrgSectionClick = (sectionId: OrgManageSectionId) => {
    if (onOrgSectionChange) {
      onOrgSectionChange(sectionId);
    } else if (currentOrgId) {
      router.push(`/settings/org/${currentOrgId}#${sectionId}`, {
        scroll: false,
      });
    }
  };

  const handleUserSectionClick = (sectionId: SectionId) => {
    if (onUserSectionChange) {
      onUserSectionChange(sectionId);
    } else {
      router.push(`/settings/user#${sectionId}`, {
        scroll: false,
      });
    }
  };

  const sidebar = (
    <nav
      className="sticky top-44 space-y-1"
      aria-label="Einstellungen Navigation"
    >
      {/* Personal Settings Section */}
      <div className="mb-4">
        <h2 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
          Persönlich
        </h2>
        {isUserSettingsPage ? (
          // Show personal settings nav items when on user settings page
          NAV_ITEMS.map((item) => (
            <NavItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              isActive={false}
              onClick={() => handleUserSectionClick(item.id)}
            />
          ))
        ) : (
          // Show link to personal settings when on org settings page
          <Link
            href="/settings/user"
            className="group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span className="truncate">Allgemein</span>
          </Link>
        )}
      </div>

      {/* Organization Management Section */}
      {managedOrgs.length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <h2 className="text-muted-foreground mb-2 px-3 text-xs font-semibold tracking-wider uppercase">
              Verwaltung
            </h2>
            {managedOrgs.map((org) => {
              const isCurrentOrg = currentOrgId === org.id;
              const isOrgActive = isOrgSettingsPage && isCurrentOrg;

              return (
                <div key={org.id} className="space-y-1">
                  {/* Organization Link */}
                  <Link
                    href={`/settings/org/${org.id}`}
                    className="group text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span className="truncate">{org.name}</span>
                  </Link>

                  {/* Organization Sub-sections (only show when on this org's page) */}
                  {isOrgActive && (
                    <div className="ml-4 space-y-1">
                      {ORG_MANAGE_NAV_ITEMS.map((item) => (
                        <NavItem
                          key={item.id}
                          label={item.label}
                          icon={item.icon}
                          isActive={false}
                          onClick={() => handleOrgSectionClick(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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

  return (
    <div className="bg-background -mt-20 min-h-screen overflow-clip rounded-l">
      {/* Header */}
      {header}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

          {/* Main Content */}
          <main className="mt-8 flex-1 space-y-8" role="main">
            {/* Mobile Navigation */}
            {mobileNav && (
              <div
                className="flex gap-2 overflow-x-auto pb-2 lg:hidden"
                role="tablist"
              >
                {mobileNav}
              </div>
            )}

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
