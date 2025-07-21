import React from "react";

interface OrganizationNotificationProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const OrganizationNotification: React.FC<OrganizationNotificationProps> = ({ checked, onChange, label }) => (
  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
    <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">{label}</div>
    <div className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 accent-slate-900 rounded focus:ring-2 focus:ring-slate-400"
        aria-label={label}
      />
      <span className="text-sm font-medium">{checked ? "On" : "Off"}</span>
    </div>
  </div>
);

export default OrganizationNotification;
