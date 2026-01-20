export const criticalFieldClass = (isEditable: boolean) =>
  `w-full rounded-md px-3 py-2 text-sm ${
    isEditable
      ? 'border border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
      : 'border border-slate-200 bg-slate-100 cursor-not-allowed text-slate-600'
  }`;

export const criticalFieldLabel = (
  label: string,
  isEditable: boolean,
  required = false
) => (
  <label className="text-sm font-medium text-slate-700">
    {label}
    {required && <span className="text-red-500"> *</span>}
    {!isEditable && (
      <span className="ml-2 text-xs font-normal text-slate-500">
        (Nur Superadmin)
      </span>
    )}
  </label>
);

export const getCriticalButtonClass = (
  isEnabled: boolean,
  variant: 'primary' | 'danger' = 'primary'
) => {
  const baseClass =
    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors';

  if (!isEnabled) {
    return `${baseClass} bg-slate-300 text-slate-500 cursor-not-allowed`;
  }

  if (variant === 'danger') {
    return `${baseClass} text-red-600 hover:bg-red-50`;
  }

  return `${baseClass} bg-slate-900 text-white hover:bg-slate-800`;
};
