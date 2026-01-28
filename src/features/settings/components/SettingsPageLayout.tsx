'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationSidebar } from './manage/OrganizationSideBar';
import { SettingsHeader } from './SettingsHeader';
import { User } from 'next-auth';

interface SettingsPageLayoutProps {
  user: Pick<User, 'orgIds' | 'activeOrganization' | 'id'> | null;
  onSignOut: () => void;
  onSave: () => void;
  isSaving?: boolean;
  children: ReactNode;
}

export function SettingsPageLayout({
  user,
  onSignOut,
  onSave,
  isSaving = false,
  children,
}: SettingsPageLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-lg bg-white outline -outline-offset-1 outline-slate-200">
            <SettingsHeader
              onSave={onSave}
              isSaving={isSaving}
              onCancel={() => router.push('/')}
            />
          </div>
        </div>
      </div>

      {/* Main content area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto h-full w-full max-w-7xl">
          <div className="flex h-full gap-4 bg-white px-2 py-4">
            {/* Sidebar - Fixed position, scrollable internally */}
            <div className="shrink-0">
              <OrganizationSidebar user={user} onSignOut={onSignOut} />
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
