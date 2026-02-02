'use client';

import { cn } from '@/lib/utils';
import type { FieldTypeKey } from '@/features/user_properties/field-type-definitions';
import { getFieldTypeDefinition } from '@/features/user_properties/field-type-definitions';

/** Standard field rows shown in the template form. Uses typeKey from shared field-type-definitions. */
export const STANDARD_FIELDS: Array<{
  name: string;
  typeKey: FieldTypeKey;
  required?: boolean;
  indent?: boolean;
}> = [
  { name: 'Name', typeKey: 'text' },
  { name: 'Kategorie', typeKey: 'select', required: true },
  { name: 'Allgemein', typeKey: 'group' },
  { name: 'Datum', typeKey: 'date', required: true, indent: true },
  { name: 'Uhrzeit von', typeKey: 'time', required: true, indent: true },
  { name: 'Uhrzeit bis', typeKey: 'time', required: true, indent: true },
  { name: 'Anzahl Teilnehmer', typeKey: 'number' },
  { name: 'Einzelpreis', typeKey: 'currency' },
  { name: 'Gesamtpreis', typeKey: 'currency' },
];

export function StandardFieldsList() {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Standardfelder</h3>
      <ul className="space-y-1.5">
        {STANDARD_FIELDS.map((field) => {
          const def = getFieldTypeDefinition(field.typeKey);
          const Icon = def?.Icon;
          const typeLabel = def?.label ?? field.typeKey;
          return (
            <li
              key={field.name}
              className={cn(
                'bg-muted/30 flex items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2',
                field.indent && 'ml-4'
              )}
            >
              <div className="flex items-center gap-2">
                {Icon && (
                  <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <span className="text-sm font-medium">{field.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({typeLabel})
                </span>
              </div>
              {field.required && (
                <span className="text-muted-foreground shrink-0 text-xs">
                  Pflichtfeld
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
