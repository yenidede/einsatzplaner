import {
  Type,
  Hash,
  Euro,
  Layers,
  Calendar,
  Clock,
  Phone,
  Mail,
  type LucideIcon,
  ToggleRight,
} from 'lucide-react';

/** All known field type keys (selectable + display-only). */
export type FieldTypeKey =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'currency'
  | 'group'
  | 'date'
  | 'time'
  | 'phone'
  | 'mail';

export type FieldTypeDefinition = {
  key: FieldTypeKey;
  label: string;
  subLabel?: string;
  Icon: LucideIcon;
};

/** Canonical list of field type definitions used by StandardFieldsList and FieldTypeSelector. */
export const FIELD_TYPE_DEFINITIONS: FieldTypeDefinition[] = [
  { key: 'text', label: 'Text', Icon: Type },
  { key: 'number', label: 'Zahl', Icon: Hash },
  { key: 'currency', label: 'Währung', Icon: Euro },
  { key: 'phone', label: 'Telefon', Icon: Phone },
  { key: 'mail', label: 'Mail', Icon: Mail },
  { key: 'boolean', label: 'Ja/Nein', Icon: ToggleRight },
  { key: 'date', label: 'Datum', Icon: Calendar },
  { key: 'time', label: 'Uhrzeit', Icon: Clock },
  { key: 'select', label: 'Auswahl', Icon: Layers },
  // { key: 'group', label: 'Feldgruppe', Icon: LayoutDashboard },
];

const DEFINITIONS_BY_KEY = new Map(
  FIELD_TYPE_DEFINITIONS.map((d) => [d.key, d])
);

const FIELD_TYPE_KEYS: ReadonlySet<string> = new Set(
  FIELD_TYPE_DEFINITIONS.map((d) => d.key)
);

/** Type guard: narrows string to FieldTypeKey so callers can avoid "as" casts. */
export function isFieldTypeKey(
  s: string | null | undefined
): s is FieldTypeKey {
  return typeof s === 'string' && FIELD_TYPE_KEYS.has(s);
}

export function getFieldTypeDefinition(
  key: FieldTypeKey
): FieldTypeDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

/** Default set of field types that are selectable (configurable via PropertyConfiguration). */
export const DEFAULT_SELECTABLE_FIELD_TYPES: Array<
  'text' | 'number' | 'boolean' | 'select'
> = ['text', 'number', 'boolean', 'select'];

/** Field types available when creating a custom field in template (Vorlage) context. Matches FIELD_TYPE_DEFINITIONS. */
export const VORLAGE_SELECTABLE_FIELD_TYPES: FieldTypeKey[] = [
  'text',
  'number',
  'boolean',
  'select',
  'currency',
  'group',
  'date',
  'time',
  'phone',
  'mail',
];
