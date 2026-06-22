'use client';

import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import {
  useCalendarExportTemplates,
  type CalendarExportTemplate,
} from '@/features/calendar-subscription/hooks/useCalendarSubscription';
import { CalendarExportDialog } from '@/components/settings/userProfile/CalendarExportDialog';

type OrganizationCalendarExportTemplatesProps = {
  org: {
    id: string;
    name: string;
    helper_name_singular?: string | null;
    helper_name_plural?: string | null;
    einsatz_name_singular?: string | null;
    einsatz_name_plural?: string | null;
  };
};

function modeLabel(mode: string) {
  return mode === 'verwaltung' ? 'Verwaltung' : 'Helfer';
}

export function OrganizationCalendarExportTemplates({
  org,
}: OrganizationCalendarExportTemplatesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] =
    useState<CalendarExportTemplate | null>(null);
  const templates = useCalendarExportTemplates(org.id);
  const { showDestructive } = useConfirmDialog();

  const eligibility = [
    {
      organization: {
        id: org.id,
        name: org.name,
        helper_name_singular: org.helper_name_singular ?? 'Helfer:in',
        helper_name_plural: org.helper_name_plural ?? 'Helfer:innen',
        einsatz_name_singular: org.einsatz_name_singular ?? 'Einsatz',
        einsatz_name_plural: org.einsatz_name_plural ?? 'Einsätze',
      },
      modes: ['helper', 'verwaltung'] as const,
    },
  ];

  const sortedTemplates = [...(templates.query.data ?? [])].sort(
    (left, right) => {
      if (left.config.mode !== right.config.mode) {
        return left.config.mode === 'helper' ? -1 : 1;
      }
      return left.name.localeCompare(right.name, 'de-AT');
    }
  );

  const openCreateDialog = () => {
    setEditTemplate(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: CalendarExportTemplate) => {
    setEditTemplate(template);
    setDialogOpen(true);
  };

  const deleteTemplate = async (template: CalendarExportTemplate) => {
    const result = await showDestructive(
      'Kalenderexport-Vorlage löschen?',
      `Möchten Sie die Vorlage „${template.name}“ wirklich löschen? Bestehende persönliche Kalenderexporte bleiben unverändert.`,
      { confirmText: 'Löschen', cancelText: 'Abbrechen' }
    );

    if (result !== 'success') {
      return;
    }

    templates.removeTemplate.mutate({ orgId: org.id, id: template.id });
  };

  if (templates.query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            Diese Vorlagen werden Benutzern beim Erstellen persönlicher
            Kalenderexporte vorgeschlagen.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Vorlage erstellen
        </Button>
      </div>

      {sortedTemplates.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="font-medium">Keine Kalenderexport-Vorlagen</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Erstellen Sie eine Vorlage, damit Benutzer schneller passende
            Kalenderexporte anlegen können.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{template.name}</p>
                  <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
                    {modeLabel(template.config.mode)}
                  </span>
                </div>
                {template.description ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {template.description}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  {template.config.mode === 'verwaltung'
                    ? 'Nur für Personen mit Verwaltungszugriff nutzbar.'
                    : 'Für Personen mit Helferzugriff nutzbar.'}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(template)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteTemplate(template)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <CalendarExportDialog
        open={dialogOpen}
        mode="template"
        eligibility={eligibility}
        initialOrgId={org.id}
        templateToEdit={editTemplate}
        onOpenChange={setDialogOpen}
        onSaveTemplate={async (input) => {
          if (input.id) {
            await templates.updateTemplate.mutateAsync({
              id: input.id,
              orgId: org.id,
              name: input.name,
              description: input.description,
              config: input.config,
            });
            return;
          }

          await templates.createTemplate.mutateAsync({
            orgId: org.id,
            name: input.name,
            description: input.description,
            config: input.config,
          });
        }}
      />
    </div>
  );
}
