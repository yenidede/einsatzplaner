'use client';

import TooltipCustom from '@/components/tooltip-custom';
import { Crown, Trash } from 'lucide-react';

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
  isCurrentUser: boolean;
  superadminCount: number;
}

/**
 * Renders the "danger zone" controls for removing a user or (de)promoting their superadmin role within an organization.
 *
 * Renders action buttons and contextual messages based on the current user's privileges, target user's roles, and loading states.
 *
 * @param organizationName - Display name of the organization shown in the danger zone header
 * @param isSuperadmin - Whether the target user currently has the superadmin role
 * @param isCurrentUserSuperadmin - Whether the current user viewing the UI is a superadmin
 * @param isCurrentUserOV - Whether the current user is an organizational validator (OV)
 * @param isTargetUserOV - Whether the target user is an organizational validator (OV)
 * @param isRemovingUser - Whether a remove-user action is in progress (disables remove button)
 * @param isDemoting - Whether a demote-from-superadmin action is in progress
 * @param isPromoting - Whether a promote-to-superadmin action is in progress
 * @param onRemoveUser - Callback invoked when the remove-user button is clicked
 * @param onDemoteFromSuperadmin - Callback invoked when the demote-from-superadmin button is clicked
 * @param onPromoteToSuperadmin - Callback invoked when the promote-to-superadmin button is clicked
 * @param isCurrentUser - Whether the target user is the current user (affects last-superadmin logic)
 * @param superadminCount - Total number of superadmins in the organization (used to determine last-superadmin)
 * @returns The component's JSX element containing danger zone controls and messages
 */
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
  isCurrentUser,
  superadminCount,
}: UserDangerZoneProps) {
  const isLoading = isDemoting || isPromoting;

  const canRemoveUser =
    isCurrentUserSuperadmin ||
    (isCurrentUserOV && !isSuperadmin && !isTargetUserOV);

  const isLastSuperadmin =
    isCurrentUser && isSuperadmin && superadminCount <= 1;

  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="flex flex-col items-start justify-between gap-2 self-stretch border-b border-slate-200 px-4 py-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <div className="font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
            Gefahrenzone!
          </div>
          <div className="font-['Inter'] text-sm leading-tight font-normal text-slate-600">
            {organizationName}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start justify-center self-stretch">
        <div className="flex flex-col items-start justify-start gap-2 self-stretch py-2 sm:flex-row sm:gap-4">
          <div className="flex w-full flex-col items-stretch justify-start gap-2 px-4 pt-2 sm:flex-row sm:items-start">
            {canRemoveUser && (
              <button
                onClick={onRemoveUser}
                disabled={isRemovingUser}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-2 transition-colors hover:bg-red-600 disabled:opacity-50 sm:w-auto"
              >
                <Trash className="shrink-0 text-white" size={20} />
                <div className="font-['Inter'] text-sm leading-normal font-medium whitespace-nowrap text-white">
                  {isRemovingUser
                    ? 'Entfernt...'
                    : 'Aus Organisation Entfernen'}
                </div>
              </button>
            )}
            {isCurrentUserSuperadmin && (
              <TooltipCustom
                text={
                  isLastSuperadmin
                    ? 'Sie können sich nicht selbst die Superadmin-Rolle entfernen, da Sie der letzte Superadmin sind'
                    : ''
                }
              >
                <button
                  onClick={
                    isSuperadmin
                      ? onDemoteFromSuperadmin
                      : onPromoteToSuperadmin
                  }
                  disabled={isLoading || isLastSuperadmin}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500 px-4 py-2 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Crown className="shrink-0 text-white" size={20} />
                  <div className="font-['Inter'] text-sm leading-normal font-medium whitespace-nowrap text-white">
                    {isLoading
                      ? isSuperadmin
                        ? 'Wird degradiert...'
                        : 'Wird ernannt...'
                      : isSuperadmin
                        ? 'Superadmin-Rolle entfernen'
                        : 'Zu Superadmin Ernennen'}
                  </div>
                </button>
              </TooltipCustom>
            )}

            {!canRemoveUser && !isCurrentUserSuperadmin && (
              <div className="px-4 py-2 text-sm text-slate-500 italic">
                Sie haben keine Berechtigung, diesen Benutzer zu entfernen.
                Bitte fragen Sie einen Superadmin, diesen Benutzer zu entfernen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
