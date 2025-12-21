"use client";

import SwitchIcon from "@/components/icon/SwitchIcon";

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
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Rollen
          </div>
          <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
            {organizationName}
          </div>
        </div>
      </div>

      <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
          <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
              Organisationsverwaltung (OV)
            </div>
            <button
              onClick={() => onToggleRole("OV")}
              disabled={saving}
              className="cursor-pointer disabled:opacity-50 transition-opacity bg-transparent 
              border-0 p-0 outline-none focus:outline-none"
            >
              <SwitchIcon isOn={userRoles.includes("OV")} disabled={saving} />
            </button>
          </div>
        </div>
      </div>

      <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
          <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
              Einsatzverwaltung (EV)
            </div>
            <button
              onClick={() => onToggleRole("EV")}
              disabled={saving}
              className="cursor-pointer disabled:opacity-50 transition-opacity bg-transparent 
              border-0 p-0 outline-none focus:outline-none"
            >
              <SwitchIcon isOn={userRoles.includes("EV")} disabled={saving} />
            </button>
          </div>
        </div>
      </div>

      <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
          <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
              Helfer:in (Helfer:in)
            </div>
            <button
              onClick={() => onToggleRole("Helfer")}
              disabled={saving}
              className="cursor-pointer disabled:opacity-50 transition-opacity bg-transparent 
              border-0 p-0 outline-none focus:outline-none"
            >
              <SwitchIcon
                isOn={userRoles.includes("Helfer")}
                disabled={saving}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
