"use client";
import { useState, useMemo } from "react";

interface UserProfileHeaderProps {
  firstname: string;
  lastname: string;
  pictureUrl: string | null;
  userOrgRoles: any[];
  getRoleColor: (role: any) => string;
  getRoleDisplayName: (role: any) => string;
}

export function UserProfileHeader({
  firstname,
  lastname,
  pictureUrl,
  userOrgRoles,
  getRoleColor,
  getRoleDisplayName,
}: UserProfileHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const initials =
    `${firstname?.[0] || ""}${lastname?.[0] || ""}`.toUpperCase() || "U";

  // Die Rollen Absteigend nach Wichtigkeit sortieren
  const sortedRoles = useMemo(() => {
    const roleOrder = {
      Helfer: 1,
      "Helfer:in": 1,
      Einsatzverwaltung: 2,
      EV: 2,
      Organisationsverwaltung: 3,
      OV: 3,
      Superadmin: 4,
      SA: 4,
    };

    return [...userOrgRoles].sort((a, b) => {
      const roleNameA = a.role?.name || a.role?.abbreviation || "";
      const roleNameB = b.role?.name || b.role?.abbreviation || "";

      const orderA = roleOrder[roleNameA as keyof typeof roleOrder] || 0;
      const orderB = roleOrder[roleNameB as keyof typeof roleOrder] || 0;

      return orderB - orderA;
    });
  }, [userOrgRoles]);

  return (
    <div className="px-4 flex flex-col justify-start items-start gap-4">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
        {pictureUrl && !imageError ? (
          <img
            src={pictureUrl}
            alt={`${firstname} ${lastname}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-slate-900 text-2xl font-semibold">
            {initials}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center items-start gap-1">
        <div className="text-slate-800 text-2xl font-semibold font-['Inter'] leading-loose">
          {firstname} {lastname}
        </div>
        <div className="inline-flex justify-start items-start gap-1 flex-wrap">
          {sortedRoles.map((userRole, index) => (
            <div
              key={index}
              className={`px-2 py-1 ${getRoleColor(
                userRole.role
              )} rounded-md flex justify-center items-center`}
            >
              <div className="text-slate-700 text-sm font-medium font-['Inter']">
                {getRoleDisplayName(userRole.role)}
              </div>
            </div>
          ))}
          {userOrgRoles.length === 0 && (
            <div className="px-2 py-1 bg-gray-200 rounded-md flex justify-center items-center">
              <div className="text-slate-700 text-sm font-medium font-['Inter']">
                Keine Rollen zugewiesen
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
