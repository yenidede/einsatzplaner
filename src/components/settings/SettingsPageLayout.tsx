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
