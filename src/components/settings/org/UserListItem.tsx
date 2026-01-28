'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { user } from '@/generated/prisma';

interface Role {
  id?: string;
  name?: string;
  abbreviation?: string;
}

interface Userss {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
}

interface UserListItemProps {
  user: Pick<user, 'id' | 'email' | 'firstname' | 'lastname' | 'picture_url'>;
  roles: Role[];
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

  const getRoleColor = (role: Role) => {
    if (role?.name === 'Superadmin') return 'bg-rose-400';
    if (role?.name === 'Organisationsverwaltung' || role?.abbreviation === 'OV')
      return 'bg-red-300';
    if (role?.name === 'Einsatzverwaltung' || role?.abbreviation === 'EV')
      return 'bg-orange-300';
    return 'bg-cyan-200';
  };

  // Sortiere Rollen: Helfer -> EV -> OV -> Superadmin
  const sortedRoles = [...roles].sort((a, b) => {
    const order: Record<string, number> = {
      Helfer: 4,
      Einsatzverwaltung: 3,
      EV: 3,
      Organisationsverwaltung: 2,
      OV: 2,
      Superadmin: 1,
    };
    const aName = a?.name || '';
    const bName = b?.name || '';
    const aOrder = order[aName] || 0;
    const bOrder = order[bName] || 0;
    return aOrder - bOrder;
  });

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
            {user.firstname && user.lastname
              ? `${user.firstname} ${user.lastname}`
              : user.email || 'Unbekannt'}
          </div>
          <div className="inline-flex items-start justify-start gap-1">
            {sortedRoles.map((role, index) => (
              <div
                key={index}
                className={`flex items-center justify-center gap-2.5 rounded-md p-1 ${getRoleColor(
                  role
                )}`}
              >
                <div className="justify-start font-['Inter'] text-sm leading-none font-medium text-slate-700">
                  {role?.abbreviation || role?.name || 'Unbekannt'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onProfileClick} variant="ghost" size="sm">
        Profil Verwalten
      </Button>
    </div>
  );
}
