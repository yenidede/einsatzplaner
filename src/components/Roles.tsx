export type RoleType = {
  id?: string;
  name: string;
  abbreviation?: string | null;
};

export function sortRolesByPriority(roles: RoleType[]): RoleType[] {
  const priority = (role: RoleType) => {
    const n = (role.name ?? '').toLowerCase();
    if (n === 'superadmin') return 4;
    if (n === 'ov' || n === 'organisationsverwaltung') return 3;
    if (n === 'ev' || n === 'einsatzverwaltung') return 2;
    if (n === 'helfer:in' || n === 'helfer') return 1;
    return 0;
  };

  return roles
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const p = priority(b.r) - priority(a.r);
      return p !== 0 ? p : a.i - b.i; // tie-break by original order
    })
    .map((x) => x.r);
}

export function OrganizationRoleBadge({ role }: { role: RoleType }) {
  const label =
    role?.abbreviation && role.abbreviation.trim().length > 0
      ? role.abbreviation
      : (role?.name ?? '');

  let bgColor = 'bg-secondary text-secondary-foreground';
  const roleName = role?.name ?? '';
  if (roleName === 'Superadmin') bgColor = 'bg-rose-200 text-rose-700';
  else if (roleName === 'OV' || roleName === 'Organisationsverwaltung')
    bgColor = 'bg-red-100 text-red-700';
  else if (roleName === 'EV' || roleName === 'Einsatzverwaltung')
    bgColor = 'bg-orange-100 text-orange-700';
  else if (roleName === 'Helfer:in' || roleName === 'Helfer')
    bgColor = 'bg-cyan-100 text-cyan-700';

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${bgColor}`}
    >
      {label}
    </span>
  );
}

export const RolesList = ({ unsortedRoles }: { unsortedRoles: RoleType[] }) => {
  const sortedRoles = unsortedRoles ? sortRolesByPriority(unsortedRoles) : [];

  return (
    <div className="flex flex-wrap gap-2">
      {sortedRoles.map((role, i) => (
        <OrganizationRoleBadge key={i} role={role}></OrganizationRoleBadge>
      ))}
    </div>
  );
};
