'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  deletePdfTemplate,
  duplicatePdfTemplate,
  setDefaultPdfTemplate,
  updatePdfTemplate,
} from '@/app/actions/pdfTemplates';
import type { PdfTemplateListItem } from '@/features/pdf-templates/types';

interface PdfTemplateListProps {
  templates: PdfTemplateListItem[];
  organizationId?: string;
  createHref?: string;
  title?: string;
  emptyMessage?: string;
}

export function PdfTemplateList({
  templates,
  organizationId,
  createHref = '/settings/pdf-templates/new',
  title = 'PDF-Vorlagen',
  emptyMessage = 'Es gibt noch keine PDF-Vorlagen für diese Organisation.',
}: PdfTemplateListProps) {
  const router = useRouter();
  const getEditHref = (templateId: string) =>
    organizationId
      ? `/settings/pdf-templates/${templateId}/edit?orgId=${organizationId}`
      : `/settings/pdf-templates/${templateId}/edit`;

  async function handleToggleActive(template: PdfTemplateListItem, isActive: boolean) {
    await updatePdfTemplate(template.id, { isActive });
    toast.success('Status aktualisiert');
    router.refresh();
  }

  async function handleDelete(template: PdfTemplateListItem) {
    if (!window.confirm(`Vorlage „${template.name}“ löschen?`)) {
      return;
    }

    await deletePdfTemplate(template.id);
    toast.success('Vorlage gelöscht');
    router.refresh();
  }

  async function handleDuplicate(template: PdfTemplateListItem) {
    await duplicatePdfTemplate(template.id);
    toast.success('Vorlage dupliziert');
    router.refresh();
  }

  async function handleSetDefault(template: PdfTemplateListItem) {
    await setDefaultPdfTemplate(template.id);
    toast.success('Standardvorlage gesetzt');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Link href={createHref}>
          <Button>Neue Vorlage</Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-6 text-sm">
          {emptyMessage}
        </div>
      ) : null}

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {template.name}
                  {template.isDefault ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Standard
                    </span>
                  ) : null}
                </CardTitle>
                <div className="text-muted-foreground text-sm">
                  Version {template.version} · {template.documentType}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Aktiv</span>
                <Switch
                  checked={template.isActive}
                  onCheckedChange={(checked) => void handleToggleActive(template, checked)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href={getEditHref(template.id)}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </Link>
              <Button variant="outline" onClick={() => void handleDuplicate(template)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplizieren
              </Button>
              <Button
                variant="outline"
                disabled={template.isDefault}
                onClick={() => void handleSetDefault(template)}
              >
                <Star className="mr-2 h-4 w-4" />
                Als Standard
              </Button>
              <Button variant="outline" onClick={() => void handleDelete(template)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
