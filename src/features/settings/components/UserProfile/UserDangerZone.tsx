"use client";

import { Crown, Trash } from "lucide-react";

interface UserDangerZoneProps {
  organizationName: string;
  isSuperadmin: boolean;
  isCurrentUserSuperadmin: boolean;
  isCurrentUserOV: boolean;
  isTargetUserOV: boolean;
  isRemovingUser: boolean;
  isDemoting: boolean;
  isPromoting: boolean;
  onRemoveUser: () => void;
  onDemoteFromSuperadmin: () => void;
  onPromoteToSuperadmin: () => void;
}

export function UserDangerZone({
  organizationName,
  isSuperadmin,
  isCurrentUserSuperadmin,
  isCurrentUserOV,
  isTargetUserOV,
  isRemovingUser,
  isDemoting,
  isPromoting,
  onRemoveUser,
  onDemoteFromSuperadmin,
  onPromoteToSuperadmin,
}: UserDangerZoneProps) {
  const isLoading = isDemoting || isPromoting;

  // Kann der aktuelle User den Ziel-User entfernen?
  // - Superadmin kann alle entfernen
  // - OV kann nur EV und Helfer entfernen (nicht Superadmin oder andere OV)
  // - Andere können niemanden entfernen
  const canRemoveUser =
    isCurrentUserSuperadmin ||
    (isCurrentUserOV && !isSuperadmin && !isTargetUserOV);

  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex justify-start items-center gap-2 flex-wrap">
          <div className="text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Gefahrenzone!
          </div>
          <div className="text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
            {organizationName}
          </div>
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-center items-start">
        <div className="self-stretch py-2 flex flex-col sm:flex-row justify-start items-start gap-2 sm:gap-4">
          <div className="w-full px-4 pt-2 flex flex-col sm:flex-row justify-start items-stretch sm:items-start gap-2">
            {canRemoveUser && (
              <button
                onClick={onRemoveUser}
                disabled={isRemovingUser}
                className="w-full sm:w-auto px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Trash className="text-white shrink-0" size={20} />
                <div className="text-white text-sm font-medium font-['Inter'] leading-normal whitespace-nowrap">
                  {isRemovingUser
                    ? "Entfernt..."
                    : "Aus Organisation Entfernen"}
                </div>
              </button>
            )}
            {isCurrentUserSuperadmin && (
              <button
                onClick={
                  isSuperadmin ? onDemoteFromSuperadmin : onPromoteToSuperadmin
                }
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Crown className="text-white shrink-0" size={20} />
                <div className="text-white text-sm font-medium font-['Inter'] leading-normal whitespace-nowrap">
                  {isLoading
                    ? isSuperadmin
                      ? "Wird degradiert..."
                      : "Wird ernannt..."
                    : isSuperadmin
                    ? "Superadmin-Rolle entfernen"
                    : "Zu Superadmin Ernennen"}
                </div>
              </button>
            )}
            {!canRemoveUser && !isCurrentUserSuperadmin && (
              <div className="text-slate-500 text-sm italic px-4 py-2">
                Sie haben keine Berechtigung, diesen Benutzer zu entfernen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
