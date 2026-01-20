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
