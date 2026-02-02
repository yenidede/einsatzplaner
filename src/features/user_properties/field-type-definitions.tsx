import {
  Type,
  Hash,
  Euro,
  Layers,
  LayoutDashboard,
  Calendar,
  Clock,
  CheckSquare,
  Phone,
  Mail,
  type LucideIcon,
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
  { key: 'boolean', label: 'Ja/Nein', Icon: CheckSquare },
  {
    key: 'select',
    label: 'Auswahl',
    subLabel: 'Dropdown mit Auswahlmöglichkeiten',
    Icon: Layers,
  },
  { key: 'currency', label: 'Währung', Icon: Euro },
  {
    key: 'group',
    label: 'Feldgruppe',
    subLabel: 'Gruppiert Felder in Erstellen-Ansicht',
    Icon: LayoutDashboard,
  },
  { key: 'date', label: 'Datum', Icon: Calendar },
  { key: 'time', label: 'Uhrzeit', Icon: Clock },
  { key: 'phone', label: 'Telefon', Icon: Phone },
  { key: 'mail', label: 'Mail', Icon: Mail },
];

const DEFINITIONS_BY_KEY = new Map(
  FIELD_TYPE_DEFINITIONS.map((d) => [d.key, d])
);

export function getFieldTypeDefinition(
  key: FieldTypeKey
): FieldTypeDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

/** Default set of field types that are selectable (configurable via PropertyConfiguration). */
export const DEFAULT_SELECTABLE_FIELD_TYPES: Array<
  'text' | 'number' | 'boolean' | 'select'
> = ['text', 'number', 'boolean', 'select'];
