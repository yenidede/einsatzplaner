'use client';

import { Pencil, Trash, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import TooltipCustom from '@/components/tooltip-custom';

/**
 * Centralized list item for all template field sections:
 * Standardfelder (StandardFieldsList), Eigene Felder (custom fields), and Überprüfungen.
 * Same layout and styling; use onOpen for click-to-edit (row + Edit button). Pass onDelete to show Delete button with tooltip.
 */
export interface TemplateFieldListItemProps {
  /** Display name of the field (string or ReactNode for inline emphasis) */
  name: React.ReactNode;
  /** Type label shown in parentheses, e.g. "text" or "number" */
  typeLabel: string;
  /** Icon component (e.g. from getFieldTypeDefinition). Rendered as Icon with size-4. */
  icon?: LucideIcon | null;
  /** Show "Pflichtfeld" on the right */
  isPflichtfeld?: boolean;
  /** Indent the row (e.g. for nested standard fields) */
  indent?: boolean;
  /** When provided, the row is clickable and an Edit (pencil) button is shown; both call this callback to open the edit view. */
  onOpen?: () => void;
  /** When provided, a Delete (trash) button with tooltip is shown. Clicks are not propagated to onOpen. */
  onDelete?: () => void;
  /** Disable the delete button (e.g. while saving). */
  deleteDisabled?: boolean;
  /** Optional right-side content in addition to Edit/Delete. Clicks are not propagated to onOpen. */
  children?: React.ReactNode;
  className?: string;
}

export function TemplateFieldListItem({
  name,
  typeLabel,
  icon: Icon,
  isPflichtfeld = false,
  indent = false,
  onOpen,
  onDelete,
  deleteDisabled = false,
  children,
  className,
}: TemplateFieldListItemProps) {
  const isClickable = !!onOpen;
  const hasActions = onOpen != null || onDelete != null || children != null;

  const actions = (onOpen != null || onDelete != null || children != null) && (
    <div
      className="ml-auto flex shrink-0 items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      {onOpen != null && (
        <TooltipCustom text="Feld bearbeiten">
          <Button type="button" variant="ghost" size="icon" onClick={onOpen}>
            <Pencil className="size-4" />
          </Button>
        </TooltipCustom>
      )}
      {onDelete != null && (
        <TooltipCustom text="Feld löschen">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={deleteDisabled}
          >
            <Trash className="size-4" />
          </Button>
        </TooltipCustom>
      )}
    </div>
  );

  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {Icon && <Icon className="text-muted-foreground h-4 w-4 shrink-0" />}
        <span className="text-sm font-medium">{name}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          ({typeLabel})
        </span>
      </div>
      {isPflichtfeld && (
        <span className="text-muted-foreground shrink-0 text-xs">
          Pflichtfeld
        </span>
      )}
      {hasActions && actions}
    </>
  );

  const baseClass = cn(
    'bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-3 py-2',
    indent && 'ml-4',
    isClickable &&
      'cursor-pointer border-border transition-colors hover:bg-muted/50 hover:border-muted-foreground/30',
    !isClickable && 'border-transparent',
    className
  );

  if (isClickable) {
    return (
      <li
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.();
          }
        }}
        className={baseClass}
      >
        {content}
      </li>
    );
  }

  return <li className={baseClass}>{content}</li>;
}
