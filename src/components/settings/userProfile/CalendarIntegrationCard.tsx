'use client';

import {
  Calendar,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import TooltipCustom from '@/components/tooltip-custom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useCategories } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useStatuses } from '@/features/einsatz_status/hooks/useStatuses';
import {
  useCalendarExportEligibility,
  useCalendarExports,
  type CalendarExport,
} from '@/features/calendar-subscription/hooks/useCalendarSubscription';
import { CalendarExportDialog } from './CalendarExportDialog';

export interface CalendarIntegrationCardProps {
  org: {
    id: string;
    name: string;
    logo_url?: string | null;
    small_logo_url?: string | null;
  };
}

function modeLabel(mode: string) {
  return mode === 'verwaltung' ? 'Verwaltung' : 'Helfer';
}

type FilterCategory = {
  id: string;
  value: string;
  abbreviation: string;
};

type FilterStatus = {
  id: string;
  helper_text: string;
  verwalter_text: string;
};

type FilterTag = {
  label: string;
  tooltip: string;
};

function buildFilterTags(
  calendarExport: CalendarExport,
  categories: FilterCategory[],
  statuses: FilterStatus[]
) {
  const parts: FilterTag[] = [];

  if (calendarExport.config.categoryIds.length > 0) {
    const categoryLabels = calendarExport.config.categoryIds.map(
      (categoryId) => {
        const category = categories.find((item) => item.id === categoryId);
        return (
          category?.abbreviation || category?.value || 'Unbekannte Kategorie'
        );
      }
    );
    parts.push({
      label: categoryLabels.join(', '),
      tooltip: `Kategorien: ${categoryLabels.join(', ')}`,
    });
  }

  if (
    calendarExport.config.statusIds.length > 0 ||
    calendarExport.config.statusPseudo.length > 0
  ) {
    const statusLabels = calendarExport.config.statusIds.map((statusId) => {
      const status = statuses.find((item) => item.id === statusId);
      if (!status) {
        return 'Unbekannter Status';
      }

      return calendarExport.config.mode === 'helper'
        ? status.helper_text
        : status.verwalter_text;
    });

    if (
      calendarExport.config.mode === 'helper' &&
      calendarExport.config.statusPseudo.includes('own')
    ) {
      statusLabels.unshift('Eigene');
    }

    const uniqueStatusLabels = Array.from(
      new Set(statusLabels.filter(Boolean))
    );
    parts.push({
      label: uniqueStatusLabels.join(', '),
      tooltip: `Status: ${uniqueStatusLabels.join(', ')}`,
    });
  }

  if (calendarExport.config.timeWindow) {
    const timeWindowLabel = `${calendarExport.config.timeWindow.from}-${calendarExport.config.timeWindow.to}`;
    parts.push({
      label: timeWindowLabel,
      tooltip: `Uhrzeit: Ereignisse zwischen ${calendarExport.config.timeWindow.from} und ${calendarExport.config.timeWindow.to}`,
    });

    if (!calendarExport.config.includeAllDay) {
      parts.push({
        label: 'Ohne ganztägige Ereignisse',
        tooltip: 'Ganztägige Ereignisse werden nicht exportiert.',
      });
    }
  }

  if (calendarExport.config.futureOnly) {
    parts.push({
      label: 'Nur zukünftig',
      tooltip: 'Es werden nur Ereignisse ab heute exportiert.',
    });
  }

  return parts;
}

type CalendarExportTagVariant =
  | 'active'
  | 'default'
  | 'destructive'
  | 'helper'
  | 'inactive'
  | 'verwaltung';

const calendarExportTagClassNames: Record<CalendarExportTagVariant, string> = {
  active:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  default: 'text-muted-foreground',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  helper:
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-300',
  inactive:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  verwaltung:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
};

function CalendarExportTag({
  children,
  tooltip,
  variant = 'default',
}: {
  children: React.ReactNode;
  tooltip?: string;
  variant?: CalendarExportTagVariant;
}) {
  const tag = (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${calendarExportTagClassNames[variant]}`}
    >
      {children}
    </span>
  );

  return tooltip ? <TooltipCustom text={tooltip}>{tag}</TooltipCustom> : tag;
}

export function CalendarIntegrationCard({ org }: CalendarIntegrationCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExport, setEditExport] = useState<CalendarExport | null>(null);
  const { showDestructive } = useConfirmDialog();
  const calendarExports = useCalendarExports();
  const eligibilityQuery = useCalendarExportEligibility();
  const categoriesQuery = useCategories(org.id);
  const statusesQuery = useStatuses();
  const logoUrl = org.small_logo_url || org.logo_url;

  const eligibility = eligibilityQuery.data ?? [];
  const orgEligibility = eligibility.find(
    (item) => item.organization.id === org.id
  );
  const exportsForOrg = useMemo(
    () =>
      (calendarExports.query.data ?? [])
        .filter((calendarExport) => calendarExport.orgId === org.id)
        .sort((left, right) => {
          if (left.is_active !== right.is_active) {
            return left.is_active ? -1 : 1;
          }
          return left.name.localeCompare(right.name, 'de-AT');
        }),
    [calendarExports.query.data, org.id]
  );

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL in Zwischenablage kopiert');
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const openCreateDialog = () => {
    setEditExport(null);
    setDialogOpen(true);
  };

  const openEditDialog = (calendarExport: CalendarExport) => {
    setEditExport(calendarExport);
    setDialogOpen(true);
  };

  const deleteExport = async (calendarExport: CalendarExport) => {
    const result = await showDestructive(
      'Kalenderexport löschen?',
      `Möchten Sie den Kalenderexport „${calendarExport.name}“ wirklich löschen? Der bestehende Kalender-Link funktioniert danach nicht mehr.`,
      { confirmText: 'Löschen', cancelText: 'Abbrechen' }
    );

    if (result !== 'success') {
      return;
    }

    calendarExports.remove.mutate(calendarExport.id);
  };

  if (calendarExports.query.isLoading || eligibilityQuery.isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-16 w-full" />
      </div>
    );
  }

  if (!orgEligibility && exportsForOrg.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={org.name}
                width={40}
                height={40}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <Calendar className="text-muted-foreground h-5 w-5" />
            )}
          </div>
          <div>
            <h4 className="font-medium">{org.name}</h4>
            <p className="text-muted-foreground text-sm">
              {exportsForOrg.length === 0
                ? 'Noch keine Kalenderexporte'
                : `${exportsForOrg.length} Kalenderexport(e)`}
            </p>
          </div>
        </div>
        {orgEligibility ? (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Export erstellen
          </Button>
        ) : null}
      </div>

      {exportsForOrg.length === 0 ? (
        <div className="bg-muted/40 rounded-md border border-dashed p-5 text-center">
          <p className="font-medium">Noch keine Kalenderexporte</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Erstellen Sie einen Export, um ihn in Ihrer Kalender-App zu
            abonnieren.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {exportsForOrg.map((calendarExport) => {
            const filterTags = buildFilterTags(
              calendarExport,
              categoriesQuery.data ?? [],
              statusesQuery.data ?? []
            ).filter(Boolean);

            return (
              <div
                key={calendarExport.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{calendarExport.name}</p>
                    <CalendarExportTag
                      variant={calendarExport.is_active ? 'active' : 'inactive'}
                    >
                      {calendarExport.is_active ? 'Aktiv' : 'Deaktiviert'}
                    </CalendarExportTag>
                    <CalendarExportTag
                      variant={
                        calendarExport.config.mode === 'verwaltung'
                          ? 'verwaltung'
                          : 'helper'
                      }
                    >
                      {modeLabel(calendarExport.config.mode)}
                    </CalendarExportTag>
                    {filterTags.map((filterTag) => (
                      <CalendarExportTag
                        key={`${filterTag.tooltip}-${filterTag.label}`}
                        tooltip={filterTag.tooltip}
                      >
                        {filterTag.label}
                      </CalendarExportTag>
                    ))}
                    {!calendarExport.modeAvailable ? (
                      <CalendarExportTag variant="destructive">
                        Zugriff fehlt
                      </CalendarExportTag>
                    ) : null}
                  </div>
                  {calendarExport.last_accessed ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Zuletzt abgerufen:{' '}
                      {new Date(
                        calendarExport.last_accessed
                      ).toLocaleDateString('de-AT')}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(calendarExport)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className={
                      !calendarExport.is_active
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  >
                    <a href={calendarExport.webcalUrl}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Kalender verbinden
                    </a>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => copyUrl(calendarExport.webcalUrl)}
                        disabled={!calendarExport.is_active}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Link kopieren
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          calendarExports.rotate.mutate(calendarExport.id)
                        }
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Link neu generieren
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          calendarExports.setActive.mutate({
                            id: calendarExport.id,
                            isActive: !calendarExport.is_active,
                          })
                        }
                      >
                        {calendarExport.is_active ? (
                          <Pause className="mr-2 h-4 w-4" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        {calendarExport.is_active
                          ? 'Deaktivieren'
                          : 'Aktivieren'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteExport(calendarExport)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CalendarExportDialog
        open={dialogOpen}
        mode="personal"
        eligibility={eligibility}
        initialOrgId={org.id}
        exportToEdit={editExport}
        onOpenChange={setDialogOpen}
        onSavePersonal={async (input) => {
          if (input.id) {
            const result = await calendarExports.updateExport.mutateAsync({
              id: input.id,
              orgId: input.orgId,
              name: input.name,
              config: input.config,
            });
            return {
              name: result.name,
              webcalUrl: result.webcalUrl,
              httpUrl: result.httpUrl,
            };
          }

          const result = await calendarExports.createExport.mutateAsync(input);
          return {
            name: result.name,
            webcalUrl: result.webcalUrl,
            httpUrl: result.httpUrl,
          };
        }}
      />
    </div>
  );
}
