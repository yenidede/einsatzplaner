'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserListItem } from './UserListItem';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useSession } from 'next-auth/react';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';

interface usersData {
  user: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    picture_url: string | null;
  };
  role: {
    id: string;
    name: string;
    abbreviation: string | null;
  };
}

interface UsersManagementSectionProps {
  usersData: usersData[];
  currentUserEmail: string;
  onUserProfileClick: (userId: string) => void;
  onInviteClick: () => void;
}

function matchesFilter(query: string, user: usersData['user']): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const name = [user.firstname, user.lastname]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const email = (user.email ?? '').toLowerCase();
  return name.includes(q) || email.includes(q);
}

export function UsersManagementSection({
  usersData,
  currentUserEmail,
  onUserProfileClick,
  onInviteClick,
}: UsersManagementSectionProps) {
  const [filterQuery, setFilterQuery] = useState('');

  const { data: session } = useSession();
  const { data: organizations } = useOrganizations(session?.user.orgIds);

  const { helper_plural } = useOrganizationTerminology(
    organizations,
    session?.user.activeOrganization?.id
  );

  const groupedUsers = usersData?.reduce(
    (
      acc: Record<
        string,
        { user: usersData['user']; roles: usersData['role'][] }
      >,
      userOrgRole: usersData
    ) => {
      const userId = userOrgRole.user?.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: userOrgRole.user,
          roles: [],
        };
      }
      acc[userId].roles.push(userOrgRole.role);
      return acc;
    },
    {}
  );
  const sortedUsers = useMemo(
    () =>
      Object.values(groupedUsers || {}).sort(
        (
          a: { user: usersData['user']; roles: usersData['role'][] },
          b: { user: usersData['user']; roles: usersData['role'][] }
        ) => {
          const getRoleWeight = (roles: usersData['role'][]) => {
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
                (r: usersData['role']) =>
                  weights[r?.name as string] ||
                  weights[r?.abbreviation as string] ||
                  0
              )
            );
          };
          return getRoleWeight(b.roles) - getRoleWeight(a.roles);
        }
      ),
    [groupedUsers]
  );

  const filteredUsers = useMemo(
    () =>
      sortedUsers.filter((groupedUser) =>
        matchesFilter(filterQuery, groupedUser.user)
      ),
    [sortedUsers, filterQuery]
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
    <div className="flex flex-col gap-5 self-stretch pb-8">
      <div className="flex flex-col gap-2">
        <label htmlFor="user-filter" className="text-sm font-medium">
          Nach Name oder E-Mail filtern
        </label>
        <Input
          id="user-filter"
          type="search"
          placeholder="Name oder E-Mail eingeben…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="max-w-sm"
          aria-label="Benutzer nach Name oder E-Mail filtern"
        />
        {filterQuery.trim() && (
          <span className="text-muted-foreground text-sm">
            {filteredUsers.length}{' '}
            {filteredUsers.length === 1 ? 'Treffer' : 'Treffer'}
          </span>
        )}
      </div>

      <div className="my-4 flex flex-col gap-5 self-stretch">
        {filteredUsers && filteredUsers.length > 0 ? (
          filteredUsers.map(
            (groupedUser: {
              user: usersData['user'];
              roles: usersData['role'][];
            }) => (
              <UserListItem
                key={groupedUser.user?.id}
                user={groupedUser.user}
                roles={groupedUser.roles}
                onProfileClick={() => onUserProfileClick(groupedUser.user?.id)}
              />
            )
          )
        ) : (
          <div className="text-muted-foreground self-stretch py-4 text-center">
            {filterQuery.trim()
              ? 'Keine Benutzer entsprechen dem Filter'
              : 'Keine User gefunden'}
          </div>
        )}
      </div>

      {canInviteUsers && (
        <div className="mt-2">
          <Button onClick={onInviteClick}>{helper_plural} einladen</Button>
        </div>
      )}
    </div>
  );
}
