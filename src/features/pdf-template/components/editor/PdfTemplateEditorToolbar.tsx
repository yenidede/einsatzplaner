'use client';

import { LoaderCircle, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PdfTemplateEditorToolbarProps {
  name: string;
  onNameChange: (value: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function PdfTemplateEditorToolbar({
  name,
  onNameChange,
  isDirty,
  isSaving,
  onSave,
}: PdfTemplateEditorToolbarProps) {
  return (
    <div className="relative z-20 rounded-[1.1rem] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 space-y-2">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500"
          >
            <span className="truncate">Einstellungen</span>
            <span className="text-slate-300">/</span>
            <span className="truncate">PDF-Vorlagen</span>
            <span className="text-slate-300">/</span>
            <span className="truncate text-slate-700">Editor</span>
          </nav>

          <div className="flex min-w-0 items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <Input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Neue Buchungsbestätigung"
                aria-label="Dokumenttitel"
                className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-semibold tracking-tight text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:ring-0 md:text-[1.55rem]"
              />
              <p className="mt-1 text-xs text-slate-500">Dokumenttitel</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:justify-start">
            <span className="text-xs text-slate-500">
              {isDirty ? 'Änderungen offen' : 'Alles gespeichert'}
            </span>
          </div>

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

export { PdfTemplateEditorToolbar as PdfTemplateEditorTopBar };
