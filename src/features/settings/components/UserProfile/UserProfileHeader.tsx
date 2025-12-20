"use client";
import { useState } from "react";

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

  return (
    <div className="px-4 flex flex-col justify-start items-start gap-2">
      <div className="w-16 h-16 px-3 py-2 rounded-[30px] flex flex-col justify-center items-center gap-3.5 bg-slate-200">
        {pictureUrl && !imageError ? (
          <img
            src={pictureUrl}
            alt={`${firstname} ${lastname}`}
            className="w-full h-full rounded-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
            {initials}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center items-start gap-1">
        <div className="justify-start text-slate-800 text-2xl font-semibold font-['Inter'] leading-loose">
          {firstname} {lastname}
        </div>
        <div className="inline-flex justify-start items-start gap-1 flex-wrap">
          {userOrgRoles.map((userRole, index) => (
            <div
              key={index}
              className={`p-1 ${getRoleColor(
                userRole.role
              )} rounded-md flex justify-center items-center gap-2.5`}
            >
              <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">
                {getRoleDisplayName(userRole.role)}
              </div>
            </div>
          ))}
          {userOrgRoles.length === 0 && (
            <div className="p-1 bg-gray-200 rounded-md flex justify-center items-center gap-2.5">
              <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">
                Keine Rollen zugewiesen
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
