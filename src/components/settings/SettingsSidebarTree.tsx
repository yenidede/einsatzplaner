'use client';

import { syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree';
import { NAV_ITEMS, type SectionId } from './constants';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from './org-manage-constants';
import { useManagedOrganizations } from '@/features/settings/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

type SettingsTreeAction =
  | { type: 'user_section'; sectionId: SectionId }
  | { type: 'user_link' }
  | { type: 'org_link'; orgId: string }
  | { type: 'org_section'; orgId: string; sectionId: OrgManageSectionId };

interface SettingsTreeItemData {
  name: string;
  children?: string[];
  action?: SettingsTreeAction;
  icon?: React.ComponentType<{ className?: string }>;
}

const INDENT = 20;

export interface SettingsSidebarTreeProps {
  currentOrgId?: string;
  onOrgSectionChange?: (sectionId: OrgManageSectionId) => void;
  onUserSectionChange?: (sectionId: SectionId) => void;
  onNavigate?: (url: string) => void | Promise<void>;
}

interface SettingsSidebarTreeContentProps extends SettingsSidebarTreeProps {
  pathname: string;
  managedOrgs: { id: string; name: string }[];
}

function SettingsSidebarTreeContent({
  pathname,
  currentOrgId,
  managedOrgs,
  onOrgSectionChange,
  onUserSectionChange,
  onNavigate,
}: SettingsSidebarTreeContentProps) {
  const router = useRouter();

  const isUserSettingsPage = pathname === '/settings/user';
  const isOrgSettingsPage =
    pathname?.startsWith('/settings/org/') ||
    pathname?.startsWith('/settings/vorlage/');

  // Tree node IDs must be unique across the whole tree. Raw IDs (org.id, section ids, etc.)
  // can collide, so we namespace all tree item ids while keeping action payloads "real".
  const rootId = 'settings-root';
  const personalId = 'user-personal';
  const userItemId = (sectionId: SectionId) => `user-${sectionId}`;
  const orgItemId = (orgId: string) => `org-${orgId}`;
  const orgSectionItemId = (orgId: string, sectionId: OrgManageSectionId) =>
    `org-${orgId}-${sectionId}`;

  const personalChildIds = NAV_ITEMS.map((item) => userItemId(item.id));
  const orgIds = managedOrgs.map((org) => orgItemId(org.id));

  const getOrgSectionIds = (orgId: string) =>
    ORG_MANAGE_NAV_ITEMS.map((item) => orgSectionItemId(orgId, item.id));

  const personalItems: Record<string, SettingsTreeItemData> =
    Object.fromEntries(
      NAV_ITEMS.map((item) => [
        userItemId(item.id),
        {
          name: item.label,
          action: { type: 'user_section' as const, sectionId: item.id },
        },
      ])
    );

  const orgItems: Record<string, SettingsTreeItemData> = Object.fromEntries(
    managedOrgs.map((org) => [
      orgItemId(org.id),
      {
        name: org.name,
        children: getOrgSectionIds(org.id),
        action: { type: 'org_link' as const, orgId: org.id },
      },
    ])
  );

  const orgSectionItems: Record<string, SettingsTreeItemData> =
    Object.fromEntries(
      managedOrgs.flatMap((org) =>
        ORG_MANAGE_NAV_ITEMS.map((item) => [
          orgSectionItemId(org.id, item.id),
          {
            name: item.label,
            icon: item.icon,
            action: {
              type: 'org_section' as const,
              orgId: org.id,
              sectionId: item.id,
            },
          },
        ])
      )
    );

  const items: Record<string, SettingsTreeItemData> = {
    [rootId]: {
      name: 'root',
      children: [personalId, ...orgIds],
    },
    [personalId]: {
      name: 'Persönlich',
      children: personalChildIds,
    },
    ...personalItems,
    ...orgItems,
    ...orgSectionItems,
  };

  const getChildren = (itemId: string): string[] => {
    const item = items[itemId];
    return item?.children ?? [];
  };

  const getItem = (itemId: string): SettingsTreeItemData =>
    items[itemId] ?? { name: itemId };

  const tree = useTree<SettingsTreeItemData>({
    dataLoader: {
      getChildren,
      getItem,
    },
    features: [syncDataLoaderFeature],
    getItemName: (item) => item.getItemData()?.name ?? '',
    indent: INDENT,
    initialState: {
      expandedItems: [personalId, ...orgIds],
    },
    isItemFolder: (item) => {
      const data = item.getItemData();
      const children = data?.children;
      return (children?.length ?? 0) > 0;
    },
    rootItemId: rootId,
  });

  const handleItemClick = (itemId: string) => {
    const data = items[itemId];
    const action = data?.action;

    if (!action) return;

    switch (action.type) {
      case 'user_section':
        if (onUserSectionChange) {
          onUserSectionChange(action.sectionId);
        } else {
          router.push(`/settings/user#${action.sectionId}`, { scroll: false });
        }
        break;
      case 'user_link': {
        const url = '/settings/user';
        if (onNavigate) {
          onNavigate(url);
        } else {
          router.push(url);
        }
        break;
      }
      case 'org_link': {
        const url = `/settings/org/${action.orgId}`;
        if (onNavigate) {
          onNavigate(url);
        } else {
          router.push(url);
        }
        break;
      }
      case 'org_section':
        if (action.orgId !== currentOrgId) {
          const url = `/settings/org/${action.orgId}#${action.sectionId}`;
          if (onNavigate) {
            onNavigate(url);
          } else {
            router.push(url);
          }
        } else {
          if (onOrgSectionChange) {
            onOrgSectionChange(action.sectionId);
          } else if (action.orgId) {
            router.push(`/settings/org/${action.orgId}#${action.sectionId}`, {
              scroll: false,
            });
          }
        }
        break;
    }
  };

  const isItemActive = (itemId: string): boolean => {
    const data = items[itemId];
    const action = data?.action;
    if (!action) return false;

    switch (action.type) {
      case 'user_section':
        return isUserSettingsPage;
      case 'user_link':
        return isUserSettingsPage;
      case 'org_link':
        return isOrgSettingsPage && currentOrgId === action.orgId;
      case 'org_section':
        return isOrgSettingsPage && currentOrgId === action.orgId;
      default:
        return false;
    }
  };

  const isOrgName = (itemId: string): boolean =>
    managedOrgs.some((org) => orgItemId(org.id) === itemId);

  const treeItems = tree.getItems().filter((item) => item.getId() !== rootId);

  return (
    <Tree
      className="relative before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
      indent={INDENT}
      tree={tree}
    >
      {treeItems.map((item) => {
        const itemId = item.getId();
        const data = item.getItemData();
        const active = isItemActive(itemId);

        return (
          <TreeItem
            item={item}
            key={itemId}
            onClick={() => handleItemClick(itemId)}
            className="cursor-pointer"
          >
            <TreeItemLabel
              className={cn(
                'before:bg-background relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10',
                active && isOrgName(itemId) && 'bg-muted'
              )}
            >
              <span className="truncate">{data?.name}</span>
            </TreeItemLabel>
          </TreeItem>
        );
      })}
    </Tree>
  );
}

export function SettingsSidebarTree({
  currentOrgId,
  onOrgSectionChange,
  onUserSectionChange,
  onNavigate,
}: SettingsSidebarTreeProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: managedOrgs = [] } = useManagedOrganizations(session?.user?.id);

  const orgIdsKey = managedOrgs.map((o) => o.id).join(',');

  return (
    <nav
      className="sticky top-44 space-y-1"
      aria-label="Einstellungen Navigation"
    >
      <SettingsSidebarTreeContent
        key={`tree-${orgIdsKey}`}
        pathname={pathname}
        currentOrgId={currentOrgId}
        managedOrgs={managedOrgs}
        onOrgSectionChange={onOrgSectionChange}
        onUserSectionChange={onUserSectionChange}
        onNavigate={onNavigate}
      />

      <Separator className="my-4" />
      <Button
        variant="outline"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-start"
        onClick={() => signOut()}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Ausloggen
      </Button>
    </nav>
  );
}
