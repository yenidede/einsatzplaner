'use client';

import { ReactNode } from 'react';
import { SettingsSidebarTree } from './SettingsSidebarTree';

interface SettingsPageLayoutProps {
  header: ReactNode;
  mobileNav?: ReactNode;
  children: ReactNode;
  // For user settings page
  onUserSectionChange?: (sectionId: import('./constants').SectionId) => void;
  // For org settings page
  currentOrgId?: string;
  onOrgSectionChange?: (
    sectionId: import('./org-manage-constants').OrgManageSectionId
  ) => void;
  // Navigation guard for unsaved changes
  onNavigate?: (url: string) => void | Promise<void>;
}

export function SettingsPageLayout({
  header,
  mobileNav,
  children,
  onUserSectionChange,
  currentOrgId,
  onOrgSectionChange,
  onNavigate,
}: SettingsPageLayoutProps) {
  const sidebar = (
    <SettingsSidebarTree
      currentOrgId={currentOrgId}
      onOrgSectionChange={onOrgSectionChange}
      onUserSectionChange={onUserSectionChange}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="bg-background min-h-screen overflow-clip rounded-l sm:-mt-20">
      {/* Header */}
      {header}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex gap-6 lg:gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

          {/* Main Content */}
          <main
            className="mt-4 min-w-0 flex-1 space-y-6 sm:mt-8 sm:space-y-8"
            role="main"
          >
            {/* Mobile Navigation */}
            {mobileNav && (
              <div
                className="-mx-3 flex gap-2 overflow-x-auto overflow-y-hidden px-3 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0 lg:hidden"
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
