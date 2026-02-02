'use client';

import {
  Type,
  Hash,
  Euro,
  Phone,
  Mail,
  CheckSquare,
  Layers,
  LayoutDashboard,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TemplateFieldTypeKey =
  | 'text'
  | 'number'
  | 'currency'
  | 'phone'
  | 'mail'
  | 'boolean'
  | 'select'
  | 'group';

const FIELD_TYPE_OPTIONS: Array<{
  key: TemplateFieldTypeKey;
  label: string;
  subLabel?: string;
  Icon: LucideIcon;
}> = [
  { key: 'text', label: 'Text', Icon: Type },
  { key: 'number', label: 'Zahl', Icon: Hash },
  { key: 'currency', label: 'Währung', Icon: Euro },
  { key: 'phone', label: 'Telefon', Icon: Phone },
  { key: 'mail', label: 'Mail', Icon: Mail },
  { key: 'boolean', label: 'Ja/Nein', Icon: CheckSquare },
  {
    key: 'select',
    label: 'Auswahl',
    subLabel: 'Dropdown mit Auswahlmöglichkeiten',
    Icon: Layers,
  },
  {
    key: 'group',
    label: 'Feldgruppe',
    subLabel: 'Gruppiert Felder in Erstellen-Ansicht',
    Icon: LayoutDashboard,
  },
];

interface TemplateFieldTypeSelectorProps {
  onSelectType: (type: TemplateFieldTypeKey) => void;
  onCancel: () => void;
}

export function TemplateFieldTypeSelector({
  onSelectType,
  onCancel,
}: TemplateFieldTypeSelectorProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Feldtyp auswählen</h3>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FIELD_TYPE_OPTIONS.map(({ key, label, subLabel, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectType(key)}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 hover:bg-slate-100"
          >
            <Icon className="h-8 w-8 text-slate-700" />
            <span className="text-center text-sm font-medium">{label}</span>
            {subLabel && (
              <span className="text-muted-foreground text-center text-xs">
                {subLabel}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
