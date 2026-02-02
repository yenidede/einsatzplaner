'use client';

import {
  Type,
  Hash,
  Euro,
  Layers,
  LayoutDashboard,
  Calendar,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STANDARD_FIELDS: Array<{
  name: string;
  typeLabel: string;
  required?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  indent?: boolean;
}> = [
  { name: 'Name', typeLabel: 'Text', icon: Type },
  { name: 'Kategorie', typeLabel: 'Auswahl', required: true, icon: Layers },
  { name: 'Allgemein', typeLabel: 'Feldgruppe', icon: LayoutDashboard },
  {
    name: 'Datum',
    typeLabel: 'Datum',
    required: true,
    icon: Calendar,
    indent: true,
  },
  {
    name: 'Uhrzeit von',
    typeLabel: 'Uhrzeit',
    required: true,
    icon: Clock,
    indent: true,
  },
  {
    name: 'Uhrzeit bis',
    typeLabel: 'Uhrzeit',
    required: true,
    icon: Clock,
    indent: true,
  },
  { name: 'Anzahl Teilnehmer', typeLabel: 'Zahl', icon: Hash },
  { name: 'Einzelpreis', typeLabel: 'Währung', icon: Euro },
  { name: 'Gesamtpreis', typeLabel: 'Währung', icon: Euro },
];

export function StandardFieldsList() {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Standardfelder</h3>
      <ul className="space-y-1.5">
        {STANDARD_FIELDS.map((field) => {
          const Icon = field.icon;
          return (
            <li
              key={field.name}
              className={cn(
                'flex items-center justify-between gap-2 rounded-md border border-transparent bg-muted/30 px-3 py-2',
                field.indent && 'ml-4'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">{field.name}</span>
                <span className="text-muted-foreground text-xs">
                  ({field.typeLabel})
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
