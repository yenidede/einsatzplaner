'use client';

import { SettingsIcon, LogOutIcon, PenIcon, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSessionSync } from '@/hooks/useSessionSync';
import { JSX } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useUserOrgRoles } from '@/features/settings/hooks/useUserOrgRoles';
import OrganizationCard from '@/features/settings/components/OrganizationCard';
import CalendarSubscription from '@/features/calendar-subscription/components/CalendarSubscriptionClient';
import { useUserProfile } from '@/features/settings/hooks/useUserProfile';

export default function UserMenu(): JSX.Element | null {
  const { data: session, status } = useSession();
  const router = useRouter();

  useSessionSync();

  const { data: organizations } = useOrganizations(session?.user?.orgIds);
  const { data: userProfile } = useUserProfile(session?.user?.id);

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
      : session?.user?.email || 'Benutzer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 p-0" align="end">
        {/* User Header */}
        <div className="flex items-start gap-4 p-6">
          <Avatar className="h-16 w-16">
            {session?.user?.picture_url && (
              <AvatarImage src={session.user.picture_url} alt={userName} />
            )}
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <button
            className="text-muted-foreground hover:bg-accent ml-auto rounded-full p-2"
            onClick={() => router.push('/settings')}
            aria-label="Schließen"
          >
            <span className="sr-only">ESC</span>
            <span className="text-muted-foreground text-xs">ESC</span>
          </button>
        </div>

        {/* User Name */}
        <div className="px-6 pb-4">
          <h3 className="text-xl font-semibold">{userName}</h3>
        </div>

        {/* Organizations with Roles */}
        <div className="space-y-6 px-6 pb-6">
          {organizations?.map((org) => (
            <OrganizationRoles
              key={org.id}
              orgId={org.id}
              orgName={org.name}
              userId={session.user.id}
            />
          ))}
        </div>
        {organizations?.length && organizations.length > 0 ? (
          organizations.map((org) => (
            <div key={org.id}>
              <OrganizationCard name={org.name} roles={userProfile?.roleIds} />
              <CalendarSubscription
                orgId={org.id}
                orgName={org.name}
                variant="card"
              />
            </div>
          ))
        ) : (
          <div className="px-4 py-2 text-slate-500">
            Sie sind noch keiner Organisation zugeordnet.
          </div>
        )}

        {/* Edit Profile Button */}
        <div className="px-6 pb-6">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => router.push('/settings')}
          >
            <PenIcon size={16} className="mr-2" aria-hidden="true" />
            Profil bearbeiten
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Integrations Section */}
        <div className="space-y-3 px-6 py-4">
          <h4 className="text-sm font-medium">Integrationen</h4>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => router.push('/settings')}
          >
            <Zap size={16} className="mr-2" aria-hidden="true" />
            Kalender verknüpfen
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Bottom Actions */}
        <div className="flex gap-2 p-6">
          <Button
            variant="default"
            className="flex-1"
            onClick={() => router.push('/settings')}
          >
            <SettingsIcon size={16} className="mr-2" aria-hidden="true" />
            Einstellungen
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleLogout}>
            <LogOutIcon size={16} className="mr-2" aria-hidden="true" />
            Ausloggen
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OrganizationRoles({
  orgId,
  orgName,
  userId,
}: {
  orgId: string;
  orgName: string;
  userId: string;
}) {
  const { data: uorRoles } = useUserOrgRoles(orgId, userId);

  const getRoleBadgeVariant = (roleName: string) => {
    const lowerName = roleName.toLowerCase();
    if (lowerName.includes('superadmin')) return 'destructive';
    if (lowerName.includes('orgverwaltung') || lowerName === 'ov')
      return 'secondary';
    if (lowerName.includes('einsatzverwaltung') || lowerName === 'ev')
      return 'default';
    return 'outline';
  };

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-sm">{orgName}</p>
      <div className="flex flex-wrap gap-2">
        {uorRoles?.map((uor) => (
          <Badge
            key={uor.id}
            variant={getRoleBadgeVariant(
              uor.role.abbreviation || uor.role.name
            )}
          >
            {uor.role.abbreviation || uor.role.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
