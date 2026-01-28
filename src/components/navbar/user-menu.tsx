'use client';

import { SettingsIcon, LogOutIcon, Zap, X, PencilIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSessionSync } from '@/hooks/useSessionSync';
import { JSX, useState } from 'react';
import Link from 'next/link';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useUserOrgRoles } from '@/features/settings/hooks/useUserOrgRoles';
import { Close, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { Popover } from '../ui/popover';
import {
  OrganizationRoleBadge,
  sortRolesByPriority,
} from '@/components/settings/OrganizationCard';

export default function UserMenu(): JSX.Element | null {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useSessionSync();

  const { data: organizations } = useOrganizations(session?.user?.orgIds);

  if (status === 'loading') {
    return (
      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
        <Avatar>
          <AvatarFallback></AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Button
        variant="ghost"
        className="h-auto p-0 hover:bg-transparent"
        asChild
      >
        <Link href="/signin">
          <Avatar></Avatar>
        </Link>
      </Button>
    );
  }

  if (session == null || !session.user) {
    router.push('/signin');
    return null;
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/signin' });
  };

  const initials = `${session?.user?.firstname?.charAt(0) ?? ''}${
    session?.user?.lastname?.charAt(0) ?? ''
  }`.toUpperCase();

  const userName =
    session?.user.firstname && session.user.lastname
      ? `${session.user.firstname} ${session.user.lastname}`
      : session?.user?.email || 'Username';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <Avatar>
            {session?.user?.picture_url && (
              <AvatarImage
                src={session.user.picture_url}
                alt={`Profilbild für ${session.user.firstname} ${session.user.lastname}`}
              />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background z-20 mt-2 max-h-[70vh] w-96 overflow-y-auto rounded-md shadow-lg"
        align="end"
      >
        <div className="flex flex-col gap-3 p-6">
          <div className="flex items-start gap-4 pb-2">
            <Avatar className="h-16 w-16">
              {session?.user?.picture_url && (
                <AvatarImage src={session.user.picture_url} alt={userName} />
              )}
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-slate-200"
              asChild
            >
              <Close aria-label="Schließen" className="ml-auto">
                <X size={16} aria-hidden="true" />
                <span className="sr-only">Schließen</span>
              </Close>
            </Button>
          </div>
          <h3 className="-mb-2 text-xl font-semibold">{userName}</h3>
          <div className="space-y-4">
            {organizations?.map((org) => (
              <OrganizationWithRoles
                key={org.id}
                orgId={org.id}
                orgName={org.name}
                userId={session.user.id}
              />
            ))}
          </div>

          <DropdownMenuSeparator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Integrationen</h4>
            <Close asChild>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/settings/user')}
              >
                <Zap size={16} aria-hidden="true" />
                Kalender verknüpfen
              </Button>
            </Close>
          </div>

          <DropdownMenuSeparator />

          {/* Bottom Actions */}
          <div className="flex gap-2">
            <Close asChild>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => router.push('/settings/user')}
              >
                <SettingsIcon size={16} className="mr-2" aria-hidden="true" />
                Einstellungen
              </Button>
            </Close>
            <Close asChild>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleLogout}
              >
                <LogOutIcon size={16} className="mr-2" aria-hidden="true" />
                Ausloggen
              </Button>
            </Close>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OrganizationWithRoles({
  orgId,
  orgName,
  userId,
}: {
  orgId: string;
  orgName: string;
  userId: string;
}) {
  const { data: uorRoles } = useUserOrgRoles(orgId, userId);
  const sortedRoles = uorRoles
    ? sortRolesByPriority(uorRoles.map((uor) => uor.role))
    : [];

  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-muted-foreground mb-2 text-sm">{orgName}</p>
        <div className="flex flex-wrap gap-2">
          {sortedRoles.map((role, i) => (
            <OrganizationRoleBadge key={i} role={role}></OrganizationRoleBadge>
          ))}
        </div>
      </div>
      {sortedRoles.find(
        (r) => r.name === 'Organisationsverwaltung' || r.name === 'OV'
      ) && (
        <Close asChild>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 py-1 text-sm"
            asChild
          >
            <Link href={`/settings/org/${orgId}`}>
              Bearbeiten{' '}
              <PencilIcon size={16} aria-hidden="true" className="mr-1" />
            </Link>
          </Button>
        </Close>
      )}
    </div>
  );
}
