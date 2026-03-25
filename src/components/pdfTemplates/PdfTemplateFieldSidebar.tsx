'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Building2,
  ChevronDown,
  Copy,
  FileStack,
  GripVertical,
  Plus,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFieldGroup,
} from '@/features/pdf-templates/types';
import { cn } from '@/lib/utils';
import { usePdfTemplateFields } from './usePdfTemplateFields';

interface PdfTemplateFieldSidebarProps {
  fields: PdfTemplateFieldDefinition[];
  onInsertField: (field: PdfTemplateFieldDefinition) => void;
}

interface GroupMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const GROUP_META: Record<PdfTemplateFieldGroup, GroupMeta> = {
  organization: {
    label: 'Organisation',
    icon: Building2,
    description: 'Stammdaten und zentrale Organisationsinformationen',
  },
  einsatz: {
    label: 'Einsatz',
    icon: FileStack,
    description: 'Allgemeine Angaben zum Einsatz und zum Dokumentkontext',
  },
  contact_person: {
    label: 'Kontaktperson',
    icon: UserRound,
    description: 'Kontaktbezogene Angaben für Ansprechpersonen',
  },
  participants: {
    label: 'Teilnehmer',
    icon: Users,
    description: 'Teilnehmerzahlen, Preise und Helferinformationen',
  },
  custom: {
    label: 'Eigene Felder',
    icon: FileStack,
    description: 'Organisationsspezifische Felder aus Templates und Eigenschaften',
  },
};

const DEFAULT_OPEN_GROUPS: Record<PdfTemplateFieldGroup, boolean> = {
  organization: true,
  einsatz: true,
  contact_person: true,
  participants: true,
  custom: true,
};

function FieldRow({
  field,
  onInsertField,
  onCopyFieldKey,
}: {
  field: PdfTemplateFieldDefinition;
  onInsertField: (field: PdfTemplateFieldDefinition) => void;
  onCopyFieldKey: (field: PdfTemplateFieldDefinition) => Promise<void>;
}) {
  return (
    <div className="group/field rounded-lg border border-transparent bg-white transition-all hover:border-slate-200 hover:bg-slate-50/80 focus-within:border-slate-300 focus-within:bg-slate-50/80">
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="text-muted-foreground mt-0.5 flex h-7 w-5 shrink-0 items-center justify-center opacity-40 transition-opacity group-hover/field:opacity-70">
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <button
          type="button"
          className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
          onClick={() => onInsertField(field)}
          title={field.key}
          aria-label={`${field.label} einfügen`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-900">
              {field.label}
            </span>
            {field.isCustom ? (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700"
              >
                {field.sourceLabel ?? 'Custom'}
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 min-h-4 text-[11px] text-slate-400 opacity-0 transition-opacity duration-150 group-hover/field:opacity-100 group-focus-within/field:opacity-100">
            {field.key}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/field:opacity-100 group-focus-within/field:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            onClick={() => void onCopyFieldKey(field)}
            aria-label={`Technischen Schlüssel für ${field.label} kopieren`}
            title="Technischen Schlüssel kopieren"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            onClick={() => onInsertField(field)}
            aria-label={`${field.label} einfügen`}
            title="Feld einfügen"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PdfTemplateFieldSidebar({
  fields,
  onInsertField,
}: PdfTemplateFieldSidebarProps) {
  const { filteredGroups, query, setQuery, hasActiveQuery } =
    usePdfTemplateFields(fields);
  const [openGroups, setOpenGroups] =
    useState<Record<PdfTemplateFieldGroup, boolean>>(DEFAULT_OPEN_GROUPS);

  useEffect(() => {
    if (!hasActiveQuery) {
      return;
    }

    setOpenGroups((current) => {
      const nextState = { ...current };

      for (const group of filteredGroups) {
        nextState[group.id] = true;
      }

      return nextState;
    });
  }, [filteredGroups, hasActiveQuery]);

  const totalVisibleFields = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.count, 0),
    [filteredGroups]
  );

  async function copyFieldKey(field: PdfTemplateFieldDefinition) {
    await navigator.clipboard.writeText(field.key);
    toast.success(`Technischer Schlüssel für "${field.label}" kopiert`);
  }

  function toggleGroup(groupId: PdfTemplateFieldGroup) {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Verfügbare Felder
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Fachlich gruppierte Felder für den PDF-Template-Builder.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-slate-200 bg-white text-[11px] font-medium text-slate-600"
          >
            {totalVisibleFields}
          </Badge>
        </div>

        <div className="relative mt-3">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Felder durchsuchen"
            className="h-10 border-slate-200 bg-white pl-9 shadow-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-2">
        {filteredGroups.length === 0 ? (
          <div className="flex h-full min-h-56 items-center justify-center px-5">
            <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <div className="text-sm font-medium text-slate-900">
                Keine Felder gefunden
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Passe den Suchbegriff an oder suche nach dem technischen
                Schlüssel.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map((group) => {
              const meta = GROUP_META[group.id];
              const Icon = meta.icon;
              const isOpen = openGroups[group.id];

              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="mt-0.5 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {meta.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-5 rounded-md border-slate-200 bg-slate-50 px-1.5 text-[10px] font-semibold text-slate-600"
                        >
                          {group.count}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {meta.description}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform',
                        !isOpen && '-rotate-90'
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-slate-100 bg-white px-2 pb-2">
                      <div className="space-y-1 pt-2">
                        {group.fields.map((field) => (
                          <FieldRow
                            key={field.key}
                            field={field}
                            onInsertField={onInsertField}
                            onCopyFieldKey={copyFieldKey}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
