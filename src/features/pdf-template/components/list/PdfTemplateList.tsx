'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { pdfTemplateQueryKeys } from '@/features/pdf-template/lib/queryKeys';
import {
  getCreatePdfTemplateSettingsPath,
  getEditPdfTemplateSettingsPath,
} from '@/features/pdf-template/lib/pdf-template-routes';
import {
  deletePdfTemplate,
  duplicatePdfTemplate,
  setDefaultPdfTemplate,
  updatePdfTemplate,
} from '@/features/pdf-template/server/pdf-template.actions';
import type { PdfTemplateListItem } from '@/features/pdf-template/types';
import { cn } from '@/lib/utils';

interface PdfTemplateListProps {
  templates: PdfTemplateListItem[];
  organizationId: string;
  title?: string;
  emptyMessage?: string;
}

export function PdfTemplateList({
  templates,
  organizationId,
  title = 'PDF-Vorlagen',
  emptyMessage = 'Es gibt noch keine PDF-Vorlagen für diese Organisation.',
}: PdfTemplateListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mutatingTemplateId, setMutatingTemplateId] = useState<string | null>(
    null
  );
  const createHref = getCreatePdfTemplateSettingsPath(organizationId);
  const getEditHref = (templateId: string) =>
    getEditPdfTemplateSettingsPath(organizationId, templateId);

  async function refreshTemplates() {
    await queryClient.invalidateQueries({
      queryKey: pdfTemplateQueryKeys.byOrganization(organizationId),
    });
    router.refresh();
  }

  async function withTemplateMutation(
    template: PdfTemplateListItem,
    action: () => Promise<void>
  ) {
    setMutatingTemplateId(template.id);

    try {
      await action();
      await refreshTemplates();
    } finally {
      setMutatingTemplateId((current) =>
        current === template.id ? null : current
      );
    }
  }

  async function handleToggleActive(
    template: PdfTemplateListItem,
    isActive: boolean
  ) {
    if (!isActive && template.isDefault) {
      toast.error('Die Standardvorlage kann nicht deaktiviert werden.');
      return;
    }

    try {
      await withTemplateMutation(template, async () => {
        await updatePdfTemplate(template.id, { isActive });
      });
      toast.success('Status aktualisiert');
    } catch (error) {
      console.error(
        `Fehler beim Aktualisieren des Status der Vorlage "${template.name}" (${template.id}):`,
        error
      );
      toast.error(
        `Der Status der Vorlage „${template.name}“ konnte nicht aktualisiert werden.`
      );
    }
  }

  async function handleDelete(template: PdfTemplateListItem) {
    if (!window.confirm(`Vorlage „${template.name}“ löschen?`)) {
      return;
    }

    try {
      await withTemplateMutation(template, async () => {
        await deletePdfTemplate(template.id);
      });
      toast.success('Vorlage gelöscht');
    } catch (error) {
      console.error(
        `Fehler beim Löschen der Vorlage "${template.name}" (${template.id}):`,
        error
      );
      toast.error(
        `Die Vorlage „${template.name}“ konnte nicht gelöscht werden.`
      );
    }
  }

  async function handleDuplicate(template: PdfTemplateListItem) {
    try {
      await withTemplateMutation(template, async () => {
        await duplicatePdfTemplate(template.id);
      });
      toast.success('Vorlage dupliziert');
    } catch (error) {
      console.error(
        `Fehler beim Duplizieren der Vorlage "${template.name}" (${template.id}):`,
        error
      );
      toast.error(
        `Die Vorlage „${template.name}“ konnte nicht dupliziert werden.`
      );
    }
  }

  async function handleSetDefault(template: PdfTemplateListItem) {
    try {
      await withTemplateMutation(template, async () => {
        await setDefaultPdfTemplate(template.id);
      });
      toast.success('Standardvorlage gesetzt');
    } catch (error) {
      console.error(
        `Fehler beim Setzen der Standardvorlage "${template.name}" (${template.id}):`,
        error
      );
      toast.error(
        `Die Vorlage „${template.name}“ konnte nicht als Standard gesetzt werden.`
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Link
          href={createHref}
          className={buttonVariants({ variant: 'default' })}
          aria-label="Neue PDF-Vorlage erstellen"
        >
          Neue Vorlage
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-6 text-sm">
          {emptyMessage}
        </div>
      ) : null}

      <div className="grid gap-4">
        {templates.map((template) => {
          const isMutating = mutatingTemplateId === template.id;

          return (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {template.name}
                  </CardTitle>
                  <div className="text-muted-foreground text-sm">
                    Version {template.version} · {template.documentType}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Aktiv</span>
                  <Switch
                    checked={template.isActive}
                    disabled={isMutating || template.isDefault}
                    onCheckedChange={(checked) =>
                      void handleToggleActive(template, checked)
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link
                  href={getEditHref(template.id)}
                  className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
                  aria-label={`Vorlage ${template.name} bearbeiten`}
                >
                  <Pencil className="h-4 w-4" />
                  Bearbeiten
                </Link>
                <Button
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => void handleDuplicate(template)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplizieren
                </Button>
                <Button
                  variant="outline"
                  disabled={isMutating || template.isDefault}
                  onClick={() => void handleSetDefault(template)}
                >
                  <Star
                    className={[
                      'mr-2 h-4 w-4',
                      template.isDefault ? 'fill-current text-amber-500' : '',
                    ].join(' ')}
                  />
                  Als Standard
                </Button>
                <Button
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => void handleDelete(template)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
