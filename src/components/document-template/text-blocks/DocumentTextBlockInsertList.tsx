'use client';

import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DocumentTextBlock } from '@/features/document-text-block/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DOCUMENT_TEXT_BLOCK_DRAG_MIME } from '../editor/utils/documentTemplateEditorConstants';

type TextBlockItemProps = {
  block: DocumentTextBlock;
  onInsert: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function TextBlockItem({
  block,
  onInsert,
  onEdit,
  onDuplicate,
  onDelete,
}: TextBlockItemProps) {
  const updatedAt = 'updatedAt' in block ? block.updatedAt : null;
  return (
    <div className="hover:bg-muted/60 group flex items-center rounded-md">
      <Button
        type="button"
        variant="ghost"
        className="h-auto min-w-0 flex-1 cursor-grab justify-start px-2 py-2 text-left"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'copy';
          event.dataTransfer.setData(
            DOCUMENT_TEXT_BLOCK_DRAG_MIME,
            JSON.stringify(block.document.content ?? [])
          );
        }}
        onClick={onInsert}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {block.name}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {block.plainText || block.description}
          </span>
          {updatedAt ? (
            <span className="text-muted-foreground mt-0.5 block text-[10px]">
              Aktualisiert am {updatedAt.toLocaleDateString('de-AT')}
            </span>
          ) : null}
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="mr-1 shrink-0 opacity-70 group-hover:opacity-100"
            aria-label={`Aktionen für ${block.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onInsert}>
            <Plus data-icon="inline-start" />
            Einfügen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            Bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy data-icon="inline-start" />
            Duplizieren
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 data-icon="inline-start" />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function DocumentTextBlockInsertList({
  textBlocks,
  onInsert,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  textBlocks: DocumentTextBlock[];
  onInsert: (textBlock: DocumentTextBlock) => void;
  onEdit: (textBlock: DocumentTextBlock) => void;
  onDuplicate: (textBlock: DocumentTextBlock) => void;
  onDelete: (textBlock: DocumentTextBlock) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Textbausteine</h3>
      <div className="flex flex-col gap-1">
        {textBlocks.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-xs">
            Noch keine passenden Textbausteine vorhanden.
          </p>
        ) : (
          textBlocks.map((block) => (
            <TextBlockItem
              key={block.id}
              block={block}
              onInsert={() => onInsert(block)}
              onEdit={() => onEdit(block)}
              onDuplicate={() => onDuplicate(block)}
              onDelete={() => onDelete(block)}
            />
          ))
        )}
      </div>
    </section>
  );
}
