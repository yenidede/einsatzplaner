'use client';

import SwitchIcon from '@/components/icon/SwitchIcon';

interface UserRoleManagementProps {
  organizationName: string;
  userRoles: string[];
  saving: boolean;
  onToggleRole: (role: string) => void;
}

export function UserRoleManagement({
  organizationName,
  userRoles,
  saving,
  onToggleRole,
}: UserRoleManagementProps) {
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

      <div className="flex flex-col items-start justify-start gap-4 self-stretch py-2">
        <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
          <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
            <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Organisationsverwaltung (OV)
            </div>
            <button
              onClick={() => onToggleRole('OV')}
              disabled={saving}
              className="cursor-pointer border-0 bg-transparent p-0 transition-opacity outline-none focus:outline-none disabled:opacity-50"
            >
              <SwitchIcon isOn={userRoles.includes('OV')} disabled={saving} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-4 self-stretch py-2">
        <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
          <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
            <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Einsatzverwaltung (EV)
            </div>
            <button
              onClick={() => onToggleRole('EV')}
              disabled={saving}
              className="cursor-pointer border-0 bg-transparent p-0 transition-opacity outline-none focus:outline-none disabled:opacity-50"
            >
              <SwitchIcon isOn={userRoles.includes('EV')} disabled={saving} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-4 self-stretch py-2">
        <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
          <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
            <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Helfer:in (Helfer:in)
            </div>
            <button
              onClick={() => onToggleRole('Helfer')}
              disabled={saving}
              className="cursor-pointer border-0 bg-transparent p-0 transition-opacity outline-none focus:outline-none disabled:opacity-50"
            >
              <SwitchIcon
                isOn={userRoles.includes('Helfer')}
                disabled={saving}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
