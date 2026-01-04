"use client";
import { Trash } from "lucide-react";
import React from "react";

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
      : role?.name ?? "";
  let bg = "bg-slate-200";
  const roleName = role?.name ?? "";
  if (roleName === "Superadmin") bg = "bg-rose-400";
  else if (roleName === "OV" || roleName === "Organisationsverwaltung")
    bg = "bg-red-300";
  else if (roleName === "EV" || roleName === "Einsatzverwaltung")
    bg = "bg-orange-300";
  else if (roleName === "Helfer:in" || roleName === "Helfer")
    bg = "bg-cyan-200";

  return (
    <div
      className={`p-1 ${bg} rounded-md flex justify-center items-center gap-2.5`}
    >
      <div className="text-slate-700 text-sm font-medium leading-none">
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

export const OrganizationCard: React.FC<OrganizationCardProps> = ({
  name,
  roles = [],
  logo,
  onLeave,
}) => {
  // normalize roles to array of RoleType objects
  const normalizedRoles: RoleType[] = (() => {
    const base: RoleType[] = Array.isArray(roles)
      ? (roles as any[]).map((r) => (typeof r === "string" ? { name: r } : r))
      : [{ name: String(roles) }];

    // sort the roles by priority
    const priority = (role: RoleType) => {
      const n = (role.name ?? "").toLowerCase();
      if (n === "superadmin") return 4;
      if (n === "ov" || n === "organisationsverwaltung") return 3;
      if (n === "ev" || n === "einsatzverwaltung") return 2;
      if (n === "helfer:in" || n === "helfer") return 1;
      return 0;
    };

    return base
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const p = priority(b.r) - priority(a.r);
        return p !== 0 ? p : a.i - b.i; // tie-break by original order
      })
      .map((x) => x.r);
  })();

  return (
    <div className="self-stretch px-4 py-6 inline-flex flex-col justify-start items-start gap-4">
      <div className="inline-flex justify-start items-center gap-4">
        {logo}
        <div className="inline-flex flex-col justify-center items-start gap-0.5">
          <div className="text-slate-800 text-xl font-normal leading-7">
            {name}
          </div>
          <div className="inline-flex flex-wrap gap-2 mt-2">
            {normalizedRoles.map((r) => (
              <OrganizationRoleBadge key={r.id ?? r.name} role={r} />
            ))}
          </div>
        </div>
      </div>

      <div className="self-stretch flex flex-col justify-start items-end gap-2.5">
        <button
          type="button"
          className="px-4 py-2 bg-red-600 text-white rounded-md inline-flex items-center gap-2"
          onClick={onLeave}
        >
          <Trash />
          <span>Organisation verlassen</span>
        </button>
      </div>
    </div>
  );
};

export default OrganizationCard;
