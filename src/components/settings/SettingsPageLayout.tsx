'use client';

import { ReactNode } from 'react';

interface SettingsPageLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  mobileNav?: ReactNode;
  children: ReactNode;
}

export function SettingsPageLayout({
  header,
  sidebar,
  mobileNav,
  children,
}: SettingsPageLayoutProps) {
  return (
    <div className="bg-background min-h-screen overflow-clip rounded-l">
      {/* Header */}
      {header}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8" role="main">
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
