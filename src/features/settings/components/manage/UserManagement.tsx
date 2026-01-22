'use client';

import { Button } from '@/components/ui/button';
import { UserListItem } from './UserListItem';

interface UsersManagementSectionProps {
  usersData: any[];
  usersLoading: boolean;
  currentUserEmail: string;
  onUserProfileClick: (userId: string) => void;
  onInviteClick: () => void;
  onSave: () => void;
}

export function UsersManagementSection({
  usersData,
  usersLoading,
  currentUserEmail,
  onUserProfileClick,
  onInviteClick,
}: UsersManagementSectionProps) {
  const groupedUsers = usersData?.reduce((acc: any, userOrgRole: any) => {
    const userId = userOrgRole.user?.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: userOrgRole.user,
        roles: [],
      };
    }
    acc[userId].roles.push(userOrgRole.role);
    return acc;
  }, {});
  const sortedUsers = Object.values(groupedUsers || {}).sort(
    (a: any, b: any) => {
      const getRoleWeight = (roles: any[]) => {
        const weights: Record<string, number> = {
          Superadmin: 4,
          Organisationsverwaltung: 3,
          OV: 3,
          Einsatzverwaltung: 2,
          EV: 2,
          Helfer: 1,
          'Helfer:in': 1,
        };
        return Math.max(
          ...roles.map(
            (r: any) =>
              weights[r?.name as string] ||
              weights[r?.abbreviation as string] ||
              0
          )
        );
      };
      return getRoleWeight(b.roles) - getRoleWeight(a.roles);
    }
  );

  // Check if current user can invite
  const currentUserRoles = usersData?.filter(
    (userOrgRole: any) => userOrgRole.user?.email === currentUserEmail
  );

  const roleNames =
    currentUserRoles?.map(
      (r: { role: { name: any; abbreviation: any } }) =>
        r.role?.name || r.role?.abbreviation
    ) || [];

  const canInviteUsers =
    roleNames.includes('Organisationsverwaltung') ||
    roleNames.includes('OV') ||
    roleNames.includes('Superadmin');

  return (
    <div className="flex flex-col items-start justify-center gap-4 self-stretch">
      <div className="flex flex-col items-start justify-start gap-2 self-stretch">
        <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
            Personen verwalten
          </div>
        </div>
        <div className="flex flex-col items-start justify-start gap-5 self-stretch border-t border-slate-200 py-2">
          {usersLoading ? (
            <div className="self-stretch px-4 py-4 text-center text-gray-500">
              Lädt User...
            </div>
          ) : sortedUsers && sortedUsers.length > 0 ? (
            sortedUsers.map((groupedUser: any) => (
              <UserListItem
                key={groupedUser.user?.id}
                user={groupedUser.user}
                roles={groupedUser.roles}
                onProfileClick={() => onUserProfileClick(groupedUser.user?.id)}
              />
            ))
          ) : (
            <div className="self-stretch px-4 py-4 text-center text-gray-500">
              Keine User gefunden
            </div>
          )}
        </div>
      </div>

      {canInviteUsers && (
          <Button onClick={onInviteClick}>Helfer einladen</Button>
        ) && (
          <div className="flex flex-col gap-4 self-stretch border-t border-slate-200 px-4 py-4">
            <button
              onClick={onInviteClick}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Helfer einladen
            </button>
          </div>
        )}
    </div>
  );
}
