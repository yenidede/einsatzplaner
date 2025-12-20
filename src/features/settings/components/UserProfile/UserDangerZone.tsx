"use client";

import { RiDeleteBinLine } from "@remixicon/react";
import { Crown } from "lucide-react";

interface UserDangerZoneProps {
  organizationName: string;
  isSuperadmin: boolean;
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
  isRemovingUser,
  isDemoting,
  isPromoting,
  onRemoveUser,
  onDemoteFromSuperadmin,
  onPromoteToSuperadmin,
}: UserDangerZoneProps) {
  const isLoading = isDemoting || isPromoting;

  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Gefahrenzone!
          </div>
          <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
            {organizationName}
          </div>
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-center items-start">
        <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
          <div className="px-4 pt-2 flex justify-start items-start gap-2">
            <button
              onClick={onRemoveUser}
              disabled={isRemovingUser}
              className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <RiDeleteBinLine
                size={24}
                aria-hidden="true"
                className="text-white"
              />
              <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                {isRemovingUser ? "Entfernt..." : "Aus Organisation Entfernen"}
              </div>
            </button>
            <button
              onClick={
                isSuperadmin ? onDemoteFromSuperadmin : onPromoteToSuperadmin
              }
              disabled={isLoading}
              className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Crown className="text-white" />
              <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                {isLoading
                  ? isSuperadmin
                    ? "Wird degradiert..."
                    : "Wird ernannt..."
                  : isSuperadmin
                  ? "Superadmin-Rolle entfernen"
                  : "Zu Superadmin Ernennen"}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
