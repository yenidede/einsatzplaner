import React from 'react';

interface OrganizationNotificationProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export const OrganizationNotification: React.FC<
  OrganizationNotificationProps
> = ({ checked, onChange, label }) => (
  <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
    <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
      {label}
    </div>
    <div className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded accent-slate-900 focus:ring-2 focus:ring-slate-400"
        aria-label={label}
      />
      <span className="text-sm font-medium">{checked ? 'On' : 'Off'}</span>
    </div>
  </div>
);

export default OrganizationNotification;
