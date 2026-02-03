'use client';

import type { FieldTypeKey } from '@/features/user_properties/field-type-definitions';
import { getFieldTypeDefinition } from '@/features/user_properties/field-type-definitions';
import { TemplateFieldListItem } from './TemplateFieldListItem';

/** Keys for standard fields that have default/placeholder on the template and can be edited. */
export type StandardFieldKey =
  | 'name'
  | 'kategorie'
  | 'time_start'
  | 'time_end'
  | 'participant_count'
  | 'price_person'
  | 'helpers_needed'
  | 'all_day'
  | 'anmerkung'
  | 'total_price';

/** Standard field rows shown in the template form. Uses typeKey from shared field-type-definitions. */
export const STANDARD_FIELDS: Array<{
  name: string;
  typeKey: FieldTypeKey;
  ispflichtfeld?: boolean;
  indent?: boolean;
  /** When set, clicking the row opens the edit view for default/placeholder. This is the exact spelling from database (_default, _placeholder will be added automatically). Checkboxes only have _default. */
  standardFieldKey?: StandardFieldKey;
}> = [
  {
    name: 'Name',
    typeKey: 'text',
    standardFieldKey: 'name',
  },
  {
    name: 'Kategorie',
    typeKey: 'select',
    standardFieldKey: 'kategorie',
  },
  { name: 'Allgemein', typeKey: 'group' },
  {
    name: 'Uhrzeit von',
    typeKey: 'time',
    ispflichtfeld: true,
    indent: true,
    standardFieldKey: 'time_start',
  },
  {
    name: 'Uhrzeit bis',
    typeKey: 'time',
    ispflichtfeld: true,
    indent: true,
    standardFieldKey: 'time_end',
  },
  {
    name: 'Ganztag',
    typeKey: 'boolean',
    standardFieldKey: 'all_day',
    indent: true,
  },
  {
    name: 'Benötigte Helfer',
    typeKey: 'number',
    standardFieldKey: 'helpers_needed',
    ispflichtfeld: true,
    indent: true,
  },
  {
    name: 'Anzahl Teilnehmer',
    typeKey: 'number',
    standardFieldKey: 'participant_count',
    ispflichtfeld: true,
    indent: true,
  },
  {
    name: 'Einzelpreis',
    typeKey: 'currency',
    standardFieldKey: 'price_person',
    ispflichtfeld: true,
    indent: true,
  },
  {
    name: 'Gesamtpreis',
    typeKey: 'currency',
    standardFieldKey: 'total_price',
    indent: true,
  },
  {
    name: 'Anmerkung',
    typeKey: 'text',
    standardFieldKey: 'anmerkung',
    indent: true,
  },
];

export interface StandardFieldsListProps {
  /** When provided, standard fields with standardFieldKey become clickable and open this callback with the key. */
  onOpenStandardField?: (key: StandardFieldKey) => void;
}

export function StandardFieldsList({
  onOpenStandardField,
}: StandardFieldsListProps = {}) {
  return (
    <ul className="space-y-2">
      {STANDARD_FIELDS.map((field) => {
        const def = getFieldTypeDefinition(field.typeKey);
        const typeLabel = def?.label ?? field.typeKey;
        const canOpen =
          field.standardFieldKey != null && onOpenStandardField != null;
        return (
          <TemplateFieldListItem
            key={field.name}
            name={field.name}
            typeLabel={typeLabel}
            icon={def?.Icon ?? undefined}
            isPflichtfeld={field.ispflichtfeld}
            indent={field.indent}
            onOpen={
              canOpen
                ? () => onOpenStandardField!(field.standardFieldKey!)
                : undefined
            }
          />
        );
      })}
    </ul>
  );
}
