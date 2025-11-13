"use client";

import { Edit, FileDown, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { CalendarEvent } from "@/components/event-calendar";

interface EventContextMenuProps {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onExportPdf: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  children: React.ReactNode;
}

export function EventContextMenu({
  event,
  onEdit,
  onExportPdf,
  onDelete,
  children,
}: EventContextMenuProps) {
  const handleEdit = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(event);
  };

  const handleExportPdf = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onExportPdf(event);
  };

  const handleDelete = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(event);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Bearbeiten</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleExportPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          <span>Export PDF</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Löschen</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
