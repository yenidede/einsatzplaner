'use client';
import { Trash } from 'lucide-react';
import React from 'react';
import { OrganizationRoleBadge, RoleType, sortRolesByPriority } from '../Roles';

interface OrganizationCardProps {
  name: string;
  roles?: RoleType[] | string[];
  logo?: React.ReactNode;
  onLeave?: () => void;
}

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
