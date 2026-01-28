'use client';

import { hotkeysCoreFeature, syncDataLoaderFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';

import { Tree, TreeItem, TreeItemLabel } from '@/components/ui/tree';

interface Item {
  name: string;
  children?: string[];
}

const items: Record<string, Item> = {
  apis: { name: 'APIs' },
  backend: { children: ['apis', 'infrastructure'], name: 'Backend' },
  company: {
    children: ['engineering', 'marketing', 'operations'],
    name: 'Company',
  },
  components: { name: 'Components' },
  content: { name: 'Content' },
  'design-system': {
    children: ['components', 'tokens', 'guidelines'],
    name: 'Design System',
  },
  engineering: {
    children: ['frontend', 'backend', 'platform-team'],
    name: 'Engineering',
  },
  finance: { name: 'Finance' },
  frontend: { children: ['design-system', 'web-platform'], name: 'Frontend' },
  guidelines: { name: 'Guidelines' },
  hr: { name: 'HR' },
  infrastructure: { name: 'Infrastructure' },
  marketing: { children: ['content', 'seo'], name: 'Marketing' },
  operations: { children: ['hr', 'finance'], name: 'Operations' },
  'platform-team': { name: 'Platform Team' },
  seo: { name: 'SEO' },
  tokens: { name: 'Tokens' },
  'web-platform': { name: 'Web Platform' },
};

const indent = 20;

export default function Component() {
  const tree = useTree<Item>({
    dataLoader: {
      getChildren: (itemId) => items[itemId].children ?? [],
      getItem: (itemId) => items[itemId],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature],
    getItemName: (item) => item.getItemData().name,
    indent,
    initialState: {
      expandedItems: ['engineering', 'frontend', 'design-system'],
    },
    isItemFolder: (item) => (item.getItemData()?.children?.length ?? 0) > 0,
    rootItemId: 'company',
  });

  return (
    <div className="flex h-full flex-col gap-2 *:first:grow">
      <div>
        <Tree
          className="relative before:absolute before:inset-0 before:-ms-1 before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)-1px),var(--border)_calc(var(--tree-indent)))]"
          indent={indent}
          tree={tree}
        >
          {tree.getItems().map((item) => {
            return (
              <TreeItem item={item} key={item.getId()}>
                <TreeItemLabel className="before:bg-background relative before:absolute before:inset-x-0 before:-inset-y-0.5 before:-z-10" />
              </TreeItem>
            );
          })}
        </Tree>
      </div>

      <p
        aria-live="polite"
        className="text-muted-foreground mt-2 text-xs"
        role="region"
      >
        Basic tree with vertical lines ∙{' '}
        <a
          className="hover:text-foreground underline"
          href="https://headless-tree.lukasbach.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          API
        </a>
      </p>
    </div>
  );
}
