'use client';

import { Button } from '@/components/ui/button';
import { TemplateCard } from '@/components/template/TemplateCard';
import type { FieldType } from '../types';
import {
  FIELD_TYPE_DEFINITIONS,
  DEFAULT_SELECTABLE_FIELD_TYPES,
  type FieldTypeKey,
} from '../field-type-definitions';

interface FieldTypeSelectorProps {
  onSelectType: (type: FieldType) => void;
  onBack: () => void;
  /** Which field types to show. Defaults to text, number, boolean, select (same as legacy). */
  enabledFieldTypes?: readonly FieldTypeKey[];
}

export function FieldTypeSelector({
  onSelectType,
  onBack,
  enabledFieldTypes = DEFAULT_SELECTABLE_FIELD_TYPES,
}: FieldTypeSelectorProps) {
  const typesToShow = FIELD_TYPE_DEFINITIONS.filter((def) =>
    enabledFieldTypes.includes(def.key)
  );

  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      <div className="inline-flex items-center justify-start gap-2.5 self-stretch pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          Feldtyp auswählen
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
        <div className="flex flex-col items-start justify-start gap-4 self-stretch">
          <div className="grid grid-cols-2 gap-4 self-stretch sm:grid-cols-3">
            {typesToShow.map((def) => {
              const Icon = def.Icon;
              return (
                <TemplateCard
                  key={def.key}
                  icon={<Icon />}
                  title={def.label}
                  description={def.subLabel}
                  onClick={() => onSelectType(def.key as FieldType)}
                />
              );
            })}
          </div>
        </div>

        <div className="inline-flex items-start justify-end gap-2 self-stretch pt-2">
          <Button onClick={onBack}>Zurück</Button>
        </div>
      </div>
    </div>
  );
}
