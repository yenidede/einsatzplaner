'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RolesList, type RoleType } from '@/components/Roles';

interface UserProfileHeaderProps {
  firstname: string;
  lastname: string;
  pictureUrl: string | null;
  userOrgRoles: { role: RoleType }[];
}

export function UserProfileHeader({
  firstname,
  lastname,
  pictureUrl,
  userOrgRoles,
}: UserProfileHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const initials =
    `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase() || 'U';

  const roles: RoleType[] = userOrgRoles.map((u) => u.role);

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
          {roles.length > 0 ? (
            <RolesList unsortedRoles={roles} displayFullRoleName={true} />
          ) : (
            <span className="bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
              Keine Rollen zugewiesen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
