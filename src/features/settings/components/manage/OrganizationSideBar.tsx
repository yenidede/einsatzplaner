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
import { useUserOrgRoles } from '../../hooks/useUserOrgRoles';

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

export function OrganizationSidebar({
  user,
  onSignOut,
}: OrganizationSidebarProps) {
  const pathname = usePathname();

  const { data: allOrgs } = useOrganizations(user?.orgIds);

  // Fetch roles for each organization dynamically
  const orgRolesQueries = (allOrgs || []).map((org) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useUserOrgRoles(org.id, user?.id)
  );

  const managedOrgs = useMemo(() => {
    if (!allOrgs) return [];

    // Filter organizations where user has admin role
    return allOrgs.filter((org, index) => {
      const rolesData = orgRolesQueries[index]?.data;
      if (!rolesData) return false;

      return rolesData.some((uor) => {
        const role = uor.role;
        const roleName = typeof role === 'string' ? role : role?.name || '';
        const roleAbbr =
          typeof role === 'string' ? '' : role?.abbreviation || '';
        const nameLower = roleName.toLowerCase();
        const abbrLower = roleAbbr.toLowerCase();
        return (
          nameLower.includes('organisationsverwaltung') ||
          nameLower.includes('superadmin') ||
          abbrLower === 'ov' ||
          nameLower === 'ov'
        );
      });
    });
  }, [allOrgs, orgRolesQueries]);

  // Build tree items dynamically based on managed organizations
  const treeItems = useMemo(() => {
    const items: Record<string, TreeItemData> = {
      root: {
        name: 'Navigation',
        children: ['settings', ...managedOrgs.map((org) => `org-${org.id}`)],
      },
      settings: { name: 'Allgemein', href: '/settings' },
    };

    // Add organizations and their sections to tree
    managedOrgs.forEach((org) => {
      const orgKey = `org-${org.id}`;
      items[orgKey] = {
        name: org.name,
        href: `/organization/${org.id}/manage`,
        children: [
          `${orgKey}-details`,
          `${orgKey}-preferences`,
          `${orgKey}-addresses`,
          `${orgKey}-bank-accounts`,
          `${orgKey}-user-properties`,
          `${orgKey}-users`,
        ],
      };

      // Add sections for each organization
      items[`${orgKey}-details`] = {
        name: 'Organisationsdetails',
        href: `/organization/${org.id}/manage#organization-details`,
      };
      items[`${orgKey}-preferences`] = {
        name: 'Einstellungen',
        href: `/organization/${org.id}/manage#preferences`,
      };
      items[`${orgKey}-addresses`] = {
        name: 'Adressen',
        href: `/organization/${org.id}/manage#addresses`,
      };
      items[`${orgKey}-bank-accounts`] = {
        name: 'Bankkonten',
        href: `/organization/${org.id}/manage#bank-accounts`,
      };
      items[`${orgKey}-user-properties`] = {
        name: 'Benutzereigenschaften',
        href: `/organization/${org.id}/manage#user-properties`,
      };
      items[`${orgKey}-users`] = {
        name: 'Benutzer',
        href: `/organization/${org.id}/manage#users`,
      };
    });

    return items;
  }, [managedOrgs]);

  const tree = useTree<TreeItemData>({
    dataLoader: {
      getChildren: (itemId) => treeItems[itemId]?.children ?? [],
      getItem: (itemId) => treeItems[itemId],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
    getItemName: (item) => item.getItemData().name,
    indent,
    initialState: {
      expandedItems: managedOrgs.map((org) => `org-${org.id}`),
    },
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    rootItemId: 'root',
  });

  return (
    <div className="sticky top-0 inline-flex h-[calc(100vh-12rem)] flex-col items-start justify-between self-stretch">
      <div className="flex h-full w-64 flex-col items-start justify-start gap-2 overflow-y-auto rounded-br-lg rounded-bl-lg px-2 py-1.5">
        <Tree className="w-full" indent={indent} tree={tree}>
          {tree.getItems().map((item) => {
            const itemData = item.getItemData();
            const isActive =
              itemData.href === pathname ||
              (itemData.href &&
                pathname.startsWith(itemData.href.split('#')[0]));

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
      </div>
      <div className="flex w-64 flex-col items-start justify-start gap-2 rounded-br-lg rounded-bl-lg px-2 py-1.5">
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
