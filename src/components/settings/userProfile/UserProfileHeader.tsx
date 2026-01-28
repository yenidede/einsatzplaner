'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';

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
    `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase() || 'U';

  // Die Rollen Absteigend nach Wichtigkeit sortieren
  const sortedRoles = useMemo(() => {
    const roleOrder = {
      Helfer: 1,
      'Helfer:in': 1,
      Einsatzverwaltung: 2,
      EV: 2,
      Organisationsverwaltung: 3,
      OV: 3,
      Superadmin: 4,
      SA: 4,
    };

    return [...userOrgRoles].sort((a, b) => {
      const roleNameA = a.role?.name || a.role?.abbreviation || '';
      const roleNameB = b.role?.name || b.role?.abbreviation || '';

      const orderA = roleOrder[roleNameA as keyof typeof roleOrder] || 0;
      const orderB = roleOrder[roleNameB as keyof typeof roleOrder] || 0;

      return orderB - orderA;
    });
  }, [userOrgRoles]);

  return (
    <div className="flex flex-col items-start justify-start gap-4 px-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-200">
        {pictureUrl && !imageError ? (
          <Image
            src={pictureUrl}
            alt={`${firstname} ${lastname}`}
            width={80}
            height={80}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-2xl font-semibold text-slate-900">
            {initials}
          </div>
        )}
      </div>
      <div className="flex flex-col items-start justify-center gap-1">
        <div className="font-['Inter'] text-2xl leading-loose font-semibold text-slate-800">
          {firstname} {lastname}
        </div>
        <div className="inline-flex flex-wrap items-start justify-start gap-1">
          {sortedRoles.map((userRole, index) => (
            <div
              key={index}
              className={`px-2 py-1 ${getRoleColor(
                userRole.role
              )} flex items-center justify-center rounded-md`}
            >
              <div className="font-['Inter'] text-sm font-medium text-slate-700">
                {getRoleDisplayName(userRole.role)}
              </div>
            </div>
          ))}
          {userOrgRoles.length === 0 && (
            <div className="flex items-center justify-center rounded-md bg-gray-200 px-2 py-1">
              <div className="font-['Inter'] text-sm font-medium text-slate-700">
                Keine Rollen zugewiesen
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
