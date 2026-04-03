'use client';

import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

interface PdfTemplateEditorToolbarProps {
  name: string;
  onNameChange: (value: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
}

export function PdfTemplateEditorToolbar({
  name,
  onNameChange,
  isDirty,
  isSaving,
  onBack,
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
            variant="ghost"
            onClick={onBack}
            size="sm"
            className="min-h-9 min-w-0 touch-manipulation px-2.5 text-sm sm:min-h-9 sm:px-3"
            type="button"
          >
            Zurück
            <span className="ml-2 hidden sm:inline">
              <Kbd>ESC</Kbd>
            </span>
          </Button>

          <Button
            type="button"
            className="h-10 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800"
            onClick={onSave}
            disabled={isSaving}
          >
            {' '}
            Speichern
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <KbdGroup className="ml-2 hidden sm:inline-flex">
                <Kbd className="h-5 min-w-5 bg-white px-1 text-slate-700">
                  ⌘
                </Kbd>
                <Kbd className="h-5 min-w-5 bg-white px-1 text-slate-700">
                  S
                </Kbd>
              </KbdGroup>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { PdfTemplateEditorToolbar as PdfTemplateEditorTopBar };
