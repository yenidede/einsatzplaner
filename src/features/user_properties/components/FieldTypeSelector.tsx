'use client';

import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FieldType } from '../types';
import {
  FIELD_TYPE_DEFINITIONS,
  DEFAULT_SELECTABLE_FIELD_TYPES,
  type FieldTypeKey,
} from '../field-type-definitions';

interface FieldTypeSelectorProps {
  onSelectType: (type: FieldType) => void;
  onBack: () => void;
  onSelectExistingField?: () => void;
  /** Which field types to show. Defaults to text, number, boolean, select (same as legacy). */
  enabledFieldTypes?: readonly FieldTypeKey[];
}

export function FieldTypeSelector({
  onSelectType,
  onBack,
  onSelectExistingField,
  enabledFieldTypes = DEFAULT_SELECTABLE_FIELD_TYPES,
}: FieldTypeSelectorProps) {
  const typesToShow = FIELD_TYPE_DEFINITIONS.filter((def) =>
    enabledFieldTypes.includes(def.key)
  );

  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      {onSelectExistingField && (
        <>
          <div className="inline-flex items-center justify-start gap-2.5 self-stretch pt-2">
            <button
              type="button"
              onClick={onSelectExistingField}
              className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-100"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-700 text-white shadow-xs ring-1 ring-slate-200">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    Empfehlung: Bestehendes Feld verknüpfen
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Vorhandenes Feld wiederverwenden statt neues anzulegen
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900">
                Öffnen
              </span>
            </button>
          </div>
        </>
      )}
      <div className="mt-2 inline-flex items-center justify-start gap-2.5 self-stretch pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          Neues Feld erstellen
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
        <div className="flex flex-col items-start justify-start gap-4 self-stretch">
          <div className="grid grid-cols-2 gap-3 self-stretch sm:grid-cols-3">
            {typesToShow.map((def) => {
              const Icon = def.Icon;
              return (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => onSelectType(def.key)}
                  className="group flex min-h-24 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-900">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="space-y-0.5">
                    <span className="block text-base leading-tight font-semibold tracking-tight text-slate-900">
                      {def.label}
                    </span>
                    {def.subLabel && (
                      <span className="text-muted-foreground block text-xs leading-snug">
                        {def.subLabel}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="inline-flex items-start justify-end gap-2 self-stretch pt-2">
          <Button onClick={onBack}>Schließen</Button>
        </div>
      </div>
    </div>
  );
}
