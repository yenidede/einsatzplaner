'use client';
import { Trash } from 'lucide-react';
import React from 'react';

interface RoleType {
  id?: string;
  name: string;
  abbreviation?: string | null;
}

interface OrganizationRoleBadgeProps {
  role: RoleType;
}

export const OrganizationRoleBadge: React.FC<OrganizationRoleBadgeProps> = ({
  role,
}) => {
  const label =
    role?.abbreviation && role.abbreviation.trim().length > 0
      ? role.abbreviation
      : (role?.name ?? '');
  let bg = 'bg-slate-200';
  const roleName = role?.name ?? '';
  if (roleName === 'Superadmin') bg = 'bg-rose-400';
  else if (roleName === 'OV' || roleName === 'Organisationsverwaltung')
    bg = 'bg-red-300';
  else if (roleName === 'EV' || roleName === 'Einsatzverwaltung')
    bg = 'bg-orange-300';
  else if (roleName === 'Helfer:in' || roleName === 'Helfer')
    bg = 'bg-cyan-200';

  return (
    <div
      className={`p-1 ${bg} flex items-center justify-center gap-2.5 rounded-md`}
    >
      <div className="text-sm leading-none font-medium text-slate-700">
        {label}
      </div>
    </div>
  );
};

interface OrganizationCardProps {
  name: string;
  roles?: RoleType[] | string[];
  logo?: React.ReactNode;
  onLeave?: () => void;
}

export const sortRolesByPriority = (roles: RoleType[]): RoleType[] => {
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
};

export const OrganizationCard: React.FC<OrganizationCardProps> = ({
  name,
  roles = [],
  logo,
  onLeave,
}) => {
  // normalize roles to array of RoleType objects
  const normalizedRoles: RoleType[] = (() => {
    const base: RoleType[] = Array.isArray(roles)
      ? roles.map((r) => (typeof r === 'string' ? { name: r } : r))
      : [{ name: String(roles) }];

    return sortRolesByPriority(base);
  })();

  return (
    <div className="inline-flex flex-col items-start justify-start gap-4 self-stretch px-4 py-6">
      <div className="inline-flex items-center justify-start gap-4">
        {logo}
        <div className="inline-flex flex-col items-start justify-center gap-0.5">
          <div className="text-xl leading-7 font-normal text-slate-800">
            {name}
          </div>
          <div className="mt-2 inline-flex flex-wrap gap-2">
            {normalizedRoles.map((r, i) => (
              <OrganizationRoleBadge key={i} role={r} />
            ))}
          </div>
        </div>
      </div>

      {onLeave && (
        <div className="flex flex-col items-end justify-start gap-2.5 self-stretch">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white"
            onClick={onLeave}
          >
            <Trash />
            <span>Organisation verlassen</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default OrganizationCard;
