'use client';

import { CopyPlus, LoaderCircle, MoreHorizontal, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface PdfTemplateEditorTopBarProps {
  name: string;
  onNameChange: (value: string) => void;
  saveStateLabel: string;
  isSaving: boolean;
  onSave: () => void;
  onDuplicate: () => void;
}

export function PdfTemplateEditorTopBar({
  name,
  onNameChange,
  saveStateLabel,
  isSaving,
  onSave,
  onDuplicate,
}: PdfTemplateEditorTopBarProps) {
  return (
    <div className="relative z-20 rounded-[1.2rem] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700"
            >
              Buchungsbestätigung
            </Badge>
            <span className="text-xs font-medium text-slate-500">
              {saveStateLabel}
            </span>
          </div>

          <Input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Buchungsbestätigung"
            className="h-10 rounded-xl border-slate-200 bg-slate-50/80 text-sm font-semibold shadow-none"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-3"
                aria-label="Weitere Aktionen"
              >
                <MoreHorizontal className="h-4 w-4" />
                Mehr
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
              <DropdownMenuItem onClick={onDuplicate}>
                <CopyPlus className="h-4 w-4" />
                Duplizieren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            className="h-10 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
