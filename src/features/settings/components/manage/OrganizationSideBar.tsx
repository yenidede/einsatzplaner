"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutIcon from "@/components/icon/LogoutIcon";
import SettingsIcon from "@/components/icon/SettingsIcon";
import OrganisationIcon from "@/features/settings/components/ui/OrganisationIcon";

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
      const roleName = typeof role === "string" ? role : role?.name || "";
      const roleAbbr = typeof role === "string" ? "" : role?.abbreviation || "";
      const nameLower = roleName.toLowerCase();
      const abbrLower = roleAbbr.toLowerCase();
      return (
        nameLower.includes("organisationsverwaltung") ||
        nameLower.includes("superadmin") ||
        abbrLower === "ov" ||
        nameLower === "ov"
      );
    });
  });

  return (
    <div className="self-stretch inline-flex flex-col justify-between items-start">
      <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
        <div className="self-stretch px-2 py-1.5 rounded-md inline-flex justify-start items-center gap-2">
          <div className="w-4 h-4 relative overflow-hidden">
            <SettingsIcon className="w-4 h-4 relative overflow-hidden" />
          </div>
          <div className="flex-1 justify-start text-base font-medium font-['Inter'] leading-normal">
            <button onClick={() => router.push(`/settings`)}>Allgemein</button>
          </div>
        </div>
        <div className="self-stretch h-px bg-slate-200" />
        <div className="justify-start text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">
          Organisationsverwaltung
        </div>
        {managedOrgs.length > 0 ? (
          managedOrgs.map((org: any) => (
            <Link
              key={org.id}
              href={`/organization/${org.id}/manage`}
              className="w-full text-left px-2 py-1.5 bg-white hover:bg-slate-50 rounded-md inline-flex justify-start items-center gap-2 transition-colors"
            >
              <OrganisationIcon />
              <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">
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
      <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
        <div
          className="self-stretch px-4 py-2 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={onSignOut}
        >
          <LogoutIcon className="w-4 h-4 relative overflow-hidden" />
          <span className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
            Ausloggen
          </span>
        </div>
      </div>
    </div>
  );
}
