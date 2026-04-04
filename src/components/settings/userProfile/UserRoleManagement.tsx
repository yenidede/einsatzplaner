'use client';

import SwitchIcon from '@/components/icon/SwitchIcon';
import type { RequiredHelperRoleNameOverrides } from '@/components/Roles';

interface UserRoleManagementProps {
  organizationName: string;
  userRoles: string[];
  saving: boolean;
  onToggleRole: (role: string) => void;
  roleNameOverrides: RequiredHelperRoleNameOverrides;
}

export function UserRoleManagement({
  organizationName,
  userRoles,
  saving,
  onToggleRole,
  roleNameOverrides,
}: UserRoleManagementProps) {
  const roleOptions = [
    {
      role: 'OV',
      label: 'Organisationsverwaltung (OV)',
    },
    {
      role: 'EV',
      label: 'Einsatzverwaltung (EV)',
    },
    {
      role: 'Helfer',
      label: roleNameOverrides['Helfer:in'],
    },
  ] as const;

  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="inline-flex items-center justify-between self-stretch border-b border-slate-200 px-4 py-2">
        <div className="flex flex-1 items-center justify-start gap-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
            Rollen
          </div>
          <div className="justify-start font-['Inter'] text-sm leading-tight font-normal text-slate-600">
            {organizationName}
          </div>
        </div>
      </div>

      {roleOptions.map(({ role, label }) => (
        <div
          key={role}
          className="flex flex-col items-start justify-start gap-4 self-stretch py-2"
        >
          <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
            <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
              <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
                {label}
              </div>
              <button
                onClick={() => onToggleRole(role)}
                disabled={saving}
                className="cursor-pointer border-0 bg-transparent p-0 transition-opacity outline-none focus:outline-none disabled:opacity-50"
              >
                <SwitchIcon isOn={userRoles.includes(role)} disabled={saving} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
