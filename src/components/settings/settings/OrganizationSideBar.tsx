'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import LogoutIcon from '@/components/icon/LogoutIcon';
import { hotkeysCoreFeature, syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree';
import { User } from 'next-auth';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useUserOrgRoles } from '../../../features/settings/hooks/useUserOrgRoles';
import { type organization } from '@/generated/prisma';

interface OrganizationSidebarProps {
  user: Pick<User, 'orgIds' | 'activeOrganization' | 'id'> | null;
  onSignOut: () => void;
}

interface TreeItemData {
  name: string;
  href?: string;
  children?: string[];
}

const indent = 20;

// Helper component that checks if org should be shown based on user roles
function OrganizationFilter({
  orgId,
  userId,
  children,
}: {
  orgId: string;
  userId: string | undefined;
  children: (shouldShow: boolean) => React.ReactNode;
}) {
  const { data: rolesData } = useUserOrgRoles(orgId, userId);

  const hasAdminRole = useMemo(() => {
    if (!rolesData) return false;

    return rolesData.some((uor) => {
      const role = uor.role;
      const roleName = typeof role === 'string' ? role : role?.name || '';
      const roleAbbr = typeof role === 'string' ? '' : role?.abbreviation || '';
      const nameLower = roleName.toLowerCase();
      const abbrLower = roleAbbr.toLowerCase();
      return (
        nameLower.includes('organisationsverwaltung') ||
        nameLower.includes('superadmin') ||
        abbrLower === 'ov' ||
        nameLower === 'ov'
      );
    });
  }, [rolesData]);

  return <>{children(hasAdminRole)}</>;
}

export function OrganizationSidebar({
  user,
  onSignOut,
}: OrganizationSidebarProps) {
  const pathname = usePathname();

  const { data: allOrgs } = useOrganizations(user?.orgIds);

  return (
    <div className="flex h-full w-64 flex-col justify-between">
      <div className="flex flex-col gap-2 overflow-y-auto px-2 py-1.5">
        {/* Allgemein link */}
        <Link
          href="/settings/user"
          className={`rounded-md px-4 py-2 transition-colors hover:bg-slate-50 ${
            pathname === '/settings/user'
              ? 'font-semibold text-slate-900'
              : 'text-slate-700'
          }`}
        >
          Allgemein
        </Link>

        {/* Organizations with role check */}
        {(allOrgs || []).map((org) => (
          <OrganizationFilter key={org.id} orgId={org.id} userId={user?.id}>
            {(shouldShow) =>
              shouldShow ? (
                <OrganizationTreeSection
                  org={org}
                  pathname={pathname}
                  userId={user?.id}
                />
              ) : null
            }
          </OrganizationFilter>
        ))}
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 px-2 py-1.5">
        <div
          className="inline-flex cursor-pointer items-center justify-center gap-2 self-stretch rounded-md px-4 py-2 outline outline-offset-1 outline-slate-200 transition-colors hover:bg-slate-50"
          onClick={onSignOut}
        >
          <LogoutIcon className="relative h-4 w-4 overflow-hidden" />
          <span className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
            Ausloggen
          </span>
        </div>
      </div>
    </div>
  );
}

// Component to render organization tree section
function OrganizationTreeSection({
  org,
  pathname,
}: {
  org: Pick<organization, 'id' | 'name'>;
  pathname: string;
  userId: string | undefined;
}) {
  const treeItems = useMemo(() => {
    const orgKey = `org-${org.id}`;
    const items: Record<string, TreeItemData> = {
      root: {
        name: org.name,
        href: `/settings/org/${org.id}`,
        children: [
          `${orgKey}-details`,
          `${orgKey}-preferences`,
          `${orgKey}-addresses`,
          `${orgKey}-bank-accounts`,
          `${orgKey}-user-properties`,
          `${orgKey}-users`,
        ],
      },
      [`${orgKey}-details`]: {
        name: 'Organisationsdetails',
        href: `/settings/org/${org.id}#organization-details`,
      },
      [`${orgKey}-preferences`]: {
        name: 'Einstellungen',
        href: `/settings/org/${org.id}#preferences`,
      },
      [`${orgKey}-addresses`]: {
        name: 'Adressen',
        href: `/settings/org/${org.id}#addresses`,
      },
      [`${orgKey}-bank-accounts`]: {
        name: 'Bankkonten',
        href: `/settings/org/${org.id}#bank-accounts`,
      },
      [`${orgKey}-user-properties`]: {
        name: 'Benutzereigenschaften',
        href: `/settings/org/${org.id}#user-properties`,
      },
      [`${orgKey}-users`]: {
        name: 'Benutzer',
        href: `/settings/org/${org.id}#users`,
      },
    };
    return items;
  }, [org.id, org.name]);

  const tree = useTree<TreeItemData>({
    dataLoader: {
      getChildren: (itemId) => treeItems[itemId]?.children ?? [],
      getItem: (itemId) => treeItems[itemId],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
    getItemName: (item) => item.getItemData().name,
    indent,
    initialState: {
      expandedItems: ['root'],
    },
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    rootItemId: 'root',
  });

  return (
    <Tree className="w-full" indent={indent} tree={tree}>
      {tree.getItems().map((item) => {
        const itemData = item.getItemData();
        const isActive =
          itemData.href === pathname ||
          (itemData.href && pathname.startsWith(itemData.href.split('#')[0]));

        return (
          <TreeItem item={item} key={item.getId()}>
            {itemData.href ? (
              <Link href={itemData.href} className="w-full">
                <TreeItemLabel
                  className={`before:bg-background relative rounded-md transition-colors before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10 hover:before:bg-slate-50 ${isActive ? 'font-semibold text-slate-900' : 'text-slate-700'} `}
                />
              </Link>
            ) : (
              <TreeItemLabel className="before:bg-background relative font-semibold text-slate-700 before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10" />
            )}
          </TreeItem>
        );
      })}
    </Tree>
  );
}
