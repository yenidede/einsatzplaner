'use client';

import type { ItemInstance } from '@headless-tree/core';
import { ChevronDownIcon } from 'lucide-react';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface TreeContextValue<T = any> {
  indent: number;
  currentItem?: ItemInstance<T>;
  tree?: any;
}

const TreeContext = React.createContext<TreeContextValue>({
  currentItem: undefined,
  indent: 20,
  tree: undefined,
});

function useTreeContext<T = any>() {
  return React.useContext(TreeContext) as TreeContextValue<T>;
}

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {
  indent?: number;
  tree?: any;
}

function Tree({ indent = 20, tree, className, ...props }: TreeProps) {
  const containerProps =
    tree && typeof tree.getContainerProps === 'function'
      ? tree.getContainerProps()
      : {};
  const mergedProps = { ...props, ...containerProps };

  // Extract style from mergedProps to merge with our custom styles
  const { style: propStyle, ...otherProps } = mergedProps;

  // Merge styles
  const mergedStyle = {
    ...propStyle,
    '--tree-indent': `${indent}px`,
  } as React.CSSProperties;

  return (
    <TreeContext.Provider value={{ indent, tree }}>
      <div
        className={cn('flex flex-col', className)}
        data-slot="tree"
        style={mergedStyle}
        {...otherProps}
      />
    </TreeContext.Provider>
  );
}

interface TreeItemProps<
  T = any,
> extends React.HTMLAttributes<HTMLButtonElement> {
  item: ItemInstance<T>;
  indent?: number;
  asChild?: boolean;
}

function TreeItem<T = any>({
  item,
  className,
  asChild,
  children,
  ...props
}: Omit<TreeItemProps<T>, 'indent'>) {
  const { indent } = useTreeContext<T>();

  const itemProps = typeof item.getProps === 'function' ? item.getProps() : {};
  const propsOnClick = props.onClick;
  const itemOnClick = itemProps.onClick;
  const mergedProps = {
    ...props,
    ...itemProps,
    onClick:
      propsOnClick && itemOnClick
        ? (e: React.MouseEvent<HTMLButtonElement>) => {
            propsOnClick(e);
            itemOnClick(e);
          }
        : (propsOnClick ?? itemOnClick),
  };

  // Extract style from mergedProps to merge with our custom styles
  const { style: propStyle, ...otherProps } = mergedProps;

  // Merge styles
  const mergedStyle = {
    ...propStyle,
    '--tree-padding': `${item.getItemMeta().level * indent}px`,
  } as React.CSSProperties;

  const Comp = asChild ? Slot.Root : 'button';

  return (
    <TreeContext.Provider value={{ currentItem: item, indent }}>
      <Comp
        aria-expanded={item.isExpanded()}
        className={cn(
          'z-10 ps-(--tree-padding) outline-hidden select-none not-last:pb-0.5 focus:z-20 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        data-drag-target={
          typeof item.isDragTarget === 'function'
            ? item.isDragTarget() || false
            : undefined
        }
        data-focus={
          typeof item.isFocused === 'function'
            ? item.isFocused() || false
            : undefined
        }
        data-folder={
          typeof item.isFolder === 'function'
            ? item.isFolder() || false
            : undefined
        }
        data-search-match={
          typeof item.isMatchingSearch === 'function'
            ? item.isMatchingSearch() || false
            : undefined
        }
        data-selected={
          typeof item.isSelected === 'function'
            ? item.isSelected() || false
            : undefined
        }
        data-slot="tree-item"
        style={mergedStyle}
        {...otherProps}
      >
        {children}
      </Comp>
    </TreeContext.Provider>
  );
}

interface TreeItemLabelProps<
  T = any,
> extends React.HTMLAttributes<HTMLSpanElement> {
  item?: ItemInstance<T>;
}

function TreeItemLabel<T = any>({
  item: propItem,
  children,
  className,
  ...props
}: TreeItemLabelProps<T>) {
  const { currentItem } = useTreeContext<T>();
  const item = propItem || currentItem;

  if (!item) {
    console.warn('TreeItemLabel: No item provided via props or context');
    return null;
  }

  return (
    <span
      className={cn(
        'bg-background in-data-[drag-target=true]:bg-accent in-data-[selected=true]:bg-accent in-data-[selected=true]:text-accent-foreground in-focus-visible:ring-ring/50 hover:bg-accent flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm transition-colors not-in-data-[folder=true]:ps-7 in-focus-visible:ring-[3px] in-data-[search-match=true]:bg-blue-400/20! [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className
      )}
      data-slot="tree-item-label"
      {...props}
    >
      {item.isFolder() && (
        <ChevronDownIcon className="text-muted-foreground size-4 in-aria-[expanded=false]:-rotate-90" />
      )}
      {children ||
        (typeof item.getItemName === 'function' ? item.getItemName() : null)}
    </span>
  );
}

function TreeDragLine({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { tree } = useTreeContext();

  if (!tree || typeof tree.getDragLineStyle !== 'function') {
    console.warn(
      'TreeDragLine: No tree provided via context or tree does not have getDragLineStyle method'
    );
    return null;
  }

  const dragLine = tree.getDragLineStyle();
  return (
    <div
      className={cn(
        'bg-primary before:border-primary before:bg-background absolute z-30 -mt-px h-0.5 w-[unset] before:absolute before:-top-[3px] before:left-0 before:size-2 before:rounded-full before:border-2',
        className
      )}
      style={dragLine}
      {...props}
    />
  );
}

export { Tree, TreeItem, TreeItemLabel, TreeDragLine };
