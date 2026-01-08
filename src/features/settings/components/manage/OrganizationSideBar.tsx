'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoutIcon from '@/components/icon/LogoutIcon';
import SettingsIcon from '@/components/icon/SettingsIcon';
import OrganisationIcon from '@/features/settings/components/ui/OrganisationIcon';

interface Organization {
  id: string;
  name: string;
  roles: any[];
}

interface OrganizationSidebarProps {
  user: any;
  onSignOut: () => void;
}

export function OrganizationSidebar({
  user,
  onSignOut,
}: OrganizationSidebarProps) {
  const router = useRouter();

  const allOrgs: any[] = Array.isArray(user?.organizations)
    ? user!.organizations
    : [];

  const managedOrgs = allOrgs.filter((org: any) => {
    if (!Array.isArray(org.roles)) return false;
    return org.roles.some((role: any) => {
      const roleName = typeof role === 'string' ? role : role?.name || '';
      const roleAbbr = typeof role === 'string' ? '' : role?.abbreviation || '';
      const nameLower = roleName.toLowerCase();
      const abbrLower = roleAbbr.toLowerCase();
      return (
        nameLower.includes('organisationsverwaltung') ||
        nameLower.includes('superadmin') ||
        abbrLower === 'ov' ||
        nameLower === 'ov'
      );
    });
  });

  return (
    <div className="inline-flex flex-col items-start justify-between self-stretch">
      <div className="flex w-64 flex-col items-start justify-start gap-2 rounded-br-lg rounded-bl-lg px-2 py-1.5">
        <Link
          href={`/settings`}
          className="inline-flex w-full items-center justify-start gap-2 rounded-md bg-white px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
        >
          <SettingsIcon />
          <div className="flex-1 justify-start font-['Inter'] text-base leading-normal font-medium text-slate-700">
            Allgemein
          </div>
        </Link>
        <div className="h-px self-stretch bg-slate-200" />
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-700">
          Organisationsverwaltung
        </div>
        {managedOrgs.length > 0 ? (
          managedOrgs.map((org: any) => (
            <Link
              key={org.id}
              href={`/organization/${org.id}/manage`}
              className="inline-flex w-full items-center justify-start gap-2 rounded-md bg-white px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
            >
              <OrganisationIcon />
              <div className="flex-1 justify-start font-['Inter'] text-base leading-normal font-medium text-slate-700">
                {org.name}
              </div>
            </Link>
          ))
        ) : (
          <div className="px-2 py-1.5 text-xs text-gray-400">
            Keine Berechtigung
          </div>
        )}
      </div>
      <div className="flex w-64 flex-col items-start justify-start gap-2 rounded-br-lg rounded-bl-lg px-2 py-1.5">
        <div
          className="inline-flex cursor-pointer items-center justify-center gap-2 self-stretch rounded-md px-4 py-2 outline outline-offset-1 outline-slate-200 transition-colors hover:bg-slate-50"
          onClick={onSignOut}
        >
          <LogoutIcon className="relative h-4 w-4 overflow-hidden" />
          <span className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
            Ausloggen
          </span>
        </div>
      </div>
    </div>
  );
}
