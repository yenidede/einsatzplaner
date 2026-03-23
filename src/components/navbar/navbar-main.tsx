'use client';

import Logo from '@/components/logo';
import NotificationMenu from '@/components/navbar/notification-menu';
import UserMenu from '@/components/navbar/user-menu';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavSwitchOrgSelect from './switch-org';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  useOrganizations,
  useOrganization,
} from '@/features/organization/hooks/use-organization-queries';
import { useUserOrgRoles } from '@/features/settings/hooks/useUserOrgRoles';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';

export default function Component() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const { data: organizations } = useOrganizations(session?.user.orgIds);
  const activeOrgId = session?.user?.activeOrganization?.id;
  const { data: activeOrganization } = useOrganization(activeOrgId);

  const { helper_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  const { data: userOrganization } = useUserOrgRoles(
    session?.user?.activeOrganization?.id,
    session?.user?.id
  );
  const hasRoleInActiveOrg = (roleName: string): boolean => {
    if (!session || !userOrganization) {
      return false;
    }
    return userOrganization.some(
      (userRole) => userRole.role.name.toLowerCase() === roleName.toLowerCase()
    );
  };

  // Navigation links array to be used in both desktop and mobile menus
  const navigationLinks = [
    {
      href: '/helferansicht',
      label: `${helper_plural}ansicht`,
      hidden:
        !hasRoleInActiveOrg('Superadmin') && !hasRoleInActiveOrg('Helfer'),
    },
    {
      href: '/einsatzverwaltung',
      label: `Verwaltungsansicht`,
      hidden:
        !hasRoleInActiveOrg('Superadmin') &&
        !hasRoleInActiveOrg('Einsatzverwaltung'),
    },
    { href: '/auswertungen', label: 'Auswertungen', hidden: true },
  ];

  return (
    <header
      className={cn(
        'bg-background fixed top-0 right-0 left-0 z-50 border-b px-4 md:px-6'
      )}
    >
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-2">
          {/* Mobile menu trigger */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className="group size-8 md:hidden"
                variant="ghost"
                size="icon"
              >
                <svg
                  className="pointer-events-none"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 12L20 12"
                    className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-315"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                  />
                  <path
                    d="M4 12H20"
                    className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-135"
                  />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-1 md:hidden">
              <NavigationMenu className="max-w-none">
                <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                  {navigationLinks
                    .filter((link) => !link.hidden)
                    .map((link, index) => {
                      const isActive = pathname === link.href;
                      return (
                        <NavigationMenuItem key={index}>
                          <NavigationMenuLink
                            href={link.href}
                            className={cn(
                              'py-1.5',
                              isActive &&
                                'text-primary border-primary font-semibold underline'
                            )}
                          >
                            {link.label}
                          </NavigationMenuLink>
                        </NavigationMenuItem>
                      );
                    })}
                </NavigationMenuList>
              </NavigationMenu>
            </PopoverContent>
          </Popover>
          {/* Main nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-primary hover:text-primary/90">
              <Logo
                logoUrl={
                  activeOrganization?.small_logo_url ||
                  activeOrganization?.logo_url ||
                  null
                }
              />
            </Link>
            {/* Navigation menu */}
            <NavigationMenu className="max-md:hidden">
              <NavigationMenuList className="gap-2">
                {navigationLinks
                  .filter((link) => !link.hidden)
                  .map((link, index) => {
                    const isActive = pathname === link.href;
                    return (
                      <NavigationMenuItem key={index}>
                        <Link
                          href={link.href}
                          className={cn(
                            'text-muted-foreground hover:text-primary hover:bg-accent focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 flex flex-col gap-1 rounded-sm p-2 py-1.5 text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1',
                            isActive &&
                              'text-primary border-primary rounded-none underline'
                          )}
                        >
                          {link.label}
                        </Link>
                      </NavigationMenuItem>
                    );
                  })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* Switch organization */}
            <NavSwitchOrgSelect organizations={organizations || []} />
            {/* Notification */}
            <NotificationMenu />
          </div>
          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
