'use client';

import { Button } from '@/components/ui/button';
import { UserListItem } from './UserListItem';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useSession } from 'next-auth/react';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';

interface UsersManagementSectionProps {
  usersData: any[];
  currentUserEmail: string;
  onUserProfileClick: (userId: string) => void;
  onInviteClick: () => void;
  onSave: () => void;
}

export function UsersManagementSection({
  usersData,
  currentUserEmail,
  onUserProfileClick,
  onInviteClick,
}: UsersManagementSectionProps) {
  const { data: session } = useSession();
  const { data: organizations } = useOrganizations(session?.user.orgIds);

  const { helper_plural } = useOrganizationTerminology(
    organizations,
    session?.user.activeOrganization?.id
  );

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
    <>
      <div className="flex flex-col items-start justify-start gap-5 self-stretch">
        {sortedUsers && sortedUsers.length > 0 ? (
          sortedUsers.map((groupedUser: any) => (
            <UserListItem
              key={groupedUser.user?.id}
              user={groupedUser.user}
              roles={groupedUser.roles}
              onProfileClick={() => onUserProfileClick(groupedUser.user?.id)}
            />
          ))
        ) : (
          <div className="self-stretch py-4 text-center text-gray-500">
            Keine User gefunden
          </div>
        )}
      </div>

      {canInviteUsers && (
        <div className="mt-8">
          <Button onClick={onInviteClick}>{helper_plural} einladen</Button>
        </div>
      )}
    </>
  );
}
