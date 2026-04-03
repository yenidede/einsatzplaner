'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import {
  Building2,
  CalendarRange,
  ChevronDown,
  Copy,
  FileStack,
  GripVertical,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PdfTemplateFieldDefinition } from '@/features/pdf-template/types';
import { cn } from '@/lib/utils';
import { usePdfTemplateFields } from '@/features/pdf-template/hooks/usePdfTemplateFields';

interface PdfTemplateFieldSidebarProps {
  fields: PdfTemplateFieldDefinition[];
  onInsertField: (field: PdfTemplateFieldDefinition) => void;
  onDragFieldStart?: (field: PdfTemplateFieldDefinition) => void;
  onDragFieldEnd?: () => void;
  insertionMode?: 'canvas' | 'footer';
  footerTargetLabel?: string | null;
}

type DisplayGroupId = 'basic' | 'organization' | 'booking' | 'custom';

interface DisplayGroup {
  id: DisplayGroupId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  fields: PdfTemplateFieldDefinition[];
  count: number;
}

const GROUP_META: Record<
  DisplayGroupId,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    description: string;
  }
> = {
  basic: {
    label: 'Basisfelder',
    icon: FileStack,
    description: 'Schnell verfügbare Angaben für Titel, Zeit und Standardtexte',
  },
  organization: {
    label: 'Organisationsfelder',
    icon: Building2,
    description: 'Adresse, Logo, Kontakt und administrative Organisationsdaten',
  },
  booking: {
    label: 'Buchungsfelder',
    icon: CalendarRange,
    description: 'Buchung, Kontaktperson, Teilnehmende und Preisangaben',
  },
  custom: {
    label: 'Eigene Felder',
    icon: Sparkles,
    description:
      'Organisationsspezifische Felder aus Templates und Eigenschaften',
  },
};

const DEFAULT_OPEN_GROUPS: Record<DisplayGroupId, boolean> = {
  basic: true,
  organization: true,
  booking: true,
  custom: true,
};

function mapFieldToDisplayGroup(
  field: PdfTemplateFieldDefinition
): DisplayGroupId {
  if (field.group === 'organization') {
    return 'organization';
  }

  if (field.group === 'custom') {
    return 'custom';
  }

  if (
    field.key === 'einsatz_titel' ||
    field.key === 'einsatz_start_datum_formatiert' ||
    field.key === 'einsatz_zeitraum_formatiert' ||
    field.key === 'einsatz_anmerkung'
  ) {
    return 'basic';
  }

  return 'booking';
}

function getFieldKindLabel(field: PdfTemplateFieldDefinition): string {
  if (field.isCustom) {
    return field.sourceLabel ?? 'Benutzerdefiniert';
  }

  if (field.group === 'organization') {
    return 'Organisation';
  }

  return 'Standard';
}

function getFieldIcon(field: PdfTemplateFieldDefinition) {
  if (field.group === 'organization') {
    return Building2;
  }

  if (field.group === 'custom') {
    return Sparkles;
  }

  return Users;
}

function FieldRow({
  field,
  onInsertField,
  onCopyFieldKey,
  onDragFieldStart,
  onDragFieldEnd,
}: {
  field: PdfTemplateFieldDefinition;
  onInsertField: (field: PdfTemplateFieldDefinition) => void;
  onCopyFieldKey: (field: PdfTemplateFieldDefinition) => Promise<void>;
  onDragFieldStart?: (field: PdfTemplateFieldDefinition) => void;
  onDragFieldEnd?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const suppressClickRef = useRef(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isCompactCard, setIsCompactCard] = useState(false);
  const Icon = getFieldIcon(field);

  useEffect(() => {
    function syncCompactCardState() {
      const nextWidth = cardRef.current?.clientWidth ?? 0;
      setIsCompactCard(nextWidth > 0 && nextWidth < 270);
    }

    syncCompactCardState();

    const resizeObserver = new ResizeObserver(syncCompactCardState);

    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={cardRef}
      draggable
      className="group/field rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)]"
      onDragStart={(event) => {
        setIsDragging(true);
        suppressClickRef.current = true;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/pdf-template-field', field.key);
        event.dataTransfer.setData('text/plain', field.key);
        onDragFieldStart?.(field);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          setIsDragging(false);
          suppressClickRef.current = false;
        }, 180);
        onDragFieldEnd?.();
      }}
    >
      <div className="grid gap-2.5">
        <div
          className={cn(
            'grid gap-3',
            isCompactCard
              ? 'grid-cols-[auto_minmax(0,1fr)]'
              : 'grid-cols-[auto_minmax(0,1fr)_auto]'
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            <Icon className="h-4 w-4" />
          </div>

          <button
            type="button"
            className="block max-w-full min-w-0 cursor-grab text-left active:cursor-grabbing"
            onClick={() => {
              if (!isDragging && !suppressClickRef.current) {
                onInsertField(field);
              }
            }}
            aria-label={`${field.label} einfügen`}
          >
            <span
              className={cn(
                'block text-sm font-semibold text-slate-950',
                isCompactCard ? 'line-clamp-2 leading-5' : 'truncate'
              )}
            >
              {field.label}
            </span>
          </button>

          <div
            className={cn(
              'flex shrink-0 items-center gap-0.5',
              isCompactCard
                ? 'col-span-2 justify-end pl-12'
                : 'justify-end self-start'
            )}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-slate-500"
              onClick={() => void onCopyFieldKey(field)}
              aria-label={`Technischen Schlüssel für ${field.label} kopieren`}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-slate-500"
              onClick={() => onInsertField(field)}
              aria-label={`${field.label} einfügen`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid gap-1.5 pl-12">
          <div>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-2 py-0 text-[10px] font-semibold text-slate-600"
            >
              {getFieldKindLabel(field)}
            </Badge>
          </div>
          <div className="truncate text-[11px] leading-[1.1rem] text-slate-500">
            {field.key}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PdfTemplateFieldSidebar({
  fields,
  onInsertField,
  onDragFieldStart,
  onDragFieldEnd,
  insertionMode = 'canvas',
  footerTargetLabel,
}: PdfTemplateFieldSidebarProps) {
  const { filteredGroups, query, setQuery, hasActiveQuery } =
    usePdfTemplateFields(fields);
  const [openGroups, setOpenGroups] =
    useState<Record<DisplayGroupId, boolean>>(DEFAULT_OPEN_GROUPS);

  const displayGroups = useMemo<DisplayGroup[]>(() => {
    const grouped = new Map<DisplayGroupId, PdfTemplateFieldDefinition[]>([
      ['basic', []],
      ['organization', []],
      ['booking', []],
      ['custom', []],
    ]);

    for (const group of filteredGroups) {
      for (const field of group.fields) {
        grouped.get(mapFieldToDisplayGroup(field))?.push(field);
      }
    }

    return (Object.keys(GROUP_META) as DisplayGroupId[])
      .map((groupId) => ({
        id: groupId,
        label: GROUP_META[groupId].label,
        icon: GROUP_META[groupId].icon,
        description: GROUP_META[groupId].description,
        fields: grouped.get(groupId) ?? [],
        count: grouped.get(groupId)?.length ?? 0,
      }))
      .filter((group) => group.count > 0);
  }, [filteredGroups]);

  useEffect(() => {
    if (!hasActiveQuery) {
      return;
    }

    setOpenGroups((current) => {
      const nextState = { ...current };

      for (const group of displayGroups) {
        nextState[group.id] = true;
      }

      return nextState;
    });
  }, [displayGroups, hasActiveQuery]);

  const totalVisibleFields = useMemo(
    () => displayGroups.reduce((sum, group) => sum + group.count, 0),
    [displayGroups]
  );
  const insertionModeLabel =
    insertionMode === 'footer' ? 'Footer-Modus' : 'Dokument-Modus';
  const insertionDescription =
    insertionMode === 'footer'
      ? footerTargetLabel
        ? `Ziehen Sie Felder in den Footer oder fügen Sie sie per Klick in ${footerTargetLabel} hinzu.`
        : 'Ziehen Sie Felder in den Footer oder fügen Sie sie per Klick hinzu.'
      : 'Ziehen Sie Datenbausteine in das Dokument oder fügen Sie sie per Klick hinzu.';

  async function copyFieldKey(field: PdfTemplateFieldDefinition) {
    await navigator.clipboard.writeText(field.key);
    toast.success(`Technischer Schlüssel für „${field.label}“ kopiert`);
  }

  function toggleGroup(groupId: DisplayGroupId) {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-slate-50 px-2 py-0 text-[10px] font-semibold text-slate-600"
              >
                {insertionModeLabel}
              </Badge>
              {insertionMode === 'footer' && footerTargetLabel ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-sky-200 bg-sky-50 px-2 py-0 text-[10px] font-semibold text-sky-700"
                >
                  Ziel: {footerTargetLabel}
                </Badge>
              ) : null}
            </div>
            <p className="mb-2 text-xs leading-5 text-slate-500">
              {insertionDescription}
            </p>
            <h2 className="text-sm font-semibold text-slate-950">
              Verfügbare Felder
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Ziehen Sie Datenbausteine in das Dokument oder fügen Sie sie per
              Klick hinzu.
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
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
            className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-2.5">
        {displayGroups.length === 0 ? (
          <div className="flex h-full min-h-56 items-center justify-center px-4">
            <div className="w-full rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="text-sm font-semibold text-slate-900">
                Keine Felder gefunden
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Passen Sie den Suchbegriff an oder suchen Sie nach dem
                technischen Schlüssel.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayGroups.map((group) => {
              const Icon = group.icon;
              const isOpen = openGroups[group.id];

              return (
                <section
                  key={group.id}
                  className="overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-slate-50"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-950">
                          {group.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="rounded-full border-slate-200 bg-slate-50 px-2 py-0 text-[10px] font-semibold text-slate-600"
                        >
                          {group.count}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-[1.1rem] text-slate-500">
                        {group.description}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform',
                        !isOpen && '-rotate-90'
                      )}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-slate-100 bg-white p-2.5 pt-2.5">
                      <div className="space-y-1.5">
                        {group.fields.map((field) => (
                          <FieldRow
                            key={field.key}
                            field={field}
                            onInsertField={onInsertField}
                            onCopyFieldKey={copyFieldKey}
                            onDragFieldStart={onDragFieldStart}
                            onDragFieldEnd={onDragFieldEnd}
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
