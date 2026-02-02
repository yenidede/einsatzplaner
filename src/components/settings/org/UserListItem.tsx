'use client';

import { RolesList, type RoleType } from '@/components/Roles';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { user } from '@/generated/prisma';

interface UserListItemProps {
  user: Pick<user, 'id' | 'email' | 'firstname' | 'lastname' | 'picture_url'>;
  roles: RoleType[];
  onProfileClick: () => void;
}

export function UserListItem({
  user,
  roles,
  onProfileClick,
}: UserListItemProps) {
  const getInitials = () => {
    const name =
      user.firstname && user.lastname
        ? `${user.firstname} ${user.lastname}`
        : user.email || '?';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="inline-flex items-center justify-between self-stretch">
      <div className="flex items-start justify-start gap-2">
        <Avatar>
          <AvatarImage
            src={user.picture_url ?? undefined}
            alt={`${user.firstname} ${user.lastname}`}
          />
          <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <div className="inline-flex flex-col items-start justify-center gap-0.5">
          <div className="justify-start font-['Inter'] text-xl leading-7 font-normal text-slate-800">
            {user.firstname && user.lastname ? (
              user.email ? (
                <>
                  {user.firstname} {user.lastname}{' '}
                  <span className="text-muted-foreground text-sm">
                    ({user.email})
                  </span>
                </>
              ) : (
                `${user.firstname} ${user.lastname}`
              )
            ) : (
              <span className="text-muted-foreground text-sm">
                Unbekannter Benutzer
              </span>
            )}
          </div>
          <RolesList unsortedRoles={roles} />
        </div>
      </div>

      <Button onClick={onProfileClick} variant="ghost" size="sm">
        Profil Verwalten
      </Button>
    </div>
  );
}
