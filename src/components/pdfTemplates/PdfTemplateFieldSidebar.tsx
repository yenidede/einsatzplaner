'use client';

import { Copy, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PdfTemplateFieldDefinition } from '@/features/pdf-templates/types';
import { usePdfTemplateFields } from './usePdfTemplateFields';

interface PdfTemplateFieldSidebarProps {
  fields: PdfTemplateFieldDefinition[];
  onInsertField: (field: PdfTemplateFieldDefinition) => void;
}

export function PdfTemplateFieldSidebar({
  fields,
  onInsertField,
}: PdfTemplateFieldSidebarProps) {
  const { filteredFields, query, setQuery } = usePdfTemplateFields(fields);

  async function copyFieldKey(field: PdfTemplateFieldDefinition) {
    await navigator.clipboard.writeText(field.key);
    toast.success(`Feldschluessel fuer "${field.label}" kopiert`);
  }

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-xl border bg-white">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold">Verfuegbare Felder</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Standardfelder und organisationsspezifische eigene Felder in einer
          gemeinsamen Liste.
        </p>
        <div className="relative mt-3">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Felder durchsuchen"
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredFields.length === 0 ? (
          <div className="text-muted-foreground px-3 py-4 text-sm">
            Keine Felder passend zur Suche gefunden.
          </div>
        ) : null}

        <div className="space-y-1">
          {filteredFields.map((field) => (
            <div
              key={field.key}
              className="group flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors hover:bg-slate-50"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onInsertField(field)}
              >
                <div className="truncate text-sm font-medium">{field.label}</div>
                <div className="text-muted-foreground truncate text-[11px]">
                  {field.key}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1 opacity-100 xl:opacity-0 xl:transition-opacity xl:group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void copyFieldKey(field)}
                  aria-label={`Feld ${field.label} kopieren`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onInsertField(field)}
                  aria-label={`Feld ${field.label} einfuegen`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
