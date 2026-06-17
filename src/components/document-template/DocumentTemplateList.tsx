'use client';

import Link from 'next/link';
import { Copy, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { DocumentTemplateListItem } from '@/features/document-template/types';
import {
  deleteDocumentTemplate,
  duplicateDocumentTemplate,
  setDefaultDocumentTemplate,
} from '@/features/document-template/server/document-template.actions';
import { documentTemplateQueryKeys } from '@/features/document-template/queryKeys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function DocumentTemplateList({
  organizationId,
  templates,
}: {
  organizationId: string;
  templates: DocumentTemplateListItem[];
}) {
  const queryClient = useQueryClient();

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: documentTemplateQueryKeys.byOrganization(organizationId),
    });
  }

  async function handleDuplicate(id: string) {
    await duplicateDocumentTemplate(id);
    toast.success('Dokumentvorlage wurde dupliziert.');
    await refresh();
  }

  async function handleDelete(template: DocumentTemplateListItem) {
    if (!window.confirm(`Dokumentvorlage „${template.name}“ löschen?`)) {
      return;
    }

    await deleteDocumentTemplate(template.id);
    toast.success('Dokumentvorlage wurde gelöscht.');
    await refresh();
  }

  async function handleSetDefault(id: string) {
    await setDefaultDocumentTemplate(id);
    toast.success('Standardvorlage wurde aktualisiert.');
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumentvorlagen</CardTitle>
        <CardDescription>
          Erstellen und verwalten Sie Vorlagen, die als Word und PDF exportiert
          werden können.
        </CardDescription>
        <CardAction>
          <Button asChild>
            <Link
              href={`/settings/org/${organizationId}/document-templates/create`}
            >
              Neue Vorlage
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
            Es gibt noch keine Dokumentvorlagen für diese Organisation.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {template.name}
                      </CardTitle>
                      <CardDescription>
                        {template.description || 'Keine Beschreibung'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary">DOCX & PDF</Badge>
                      {template.isDefault ? <Badge>Standard</Badge> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/settings/org/${organizationId}/document-templates/${template.id}/edit`}
                    >
                      <Pencil data-icon="inline-start" />
                      Bearbeiten
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDuplicate(template.id)}
                  >
                    <Copy data-icon="inline-start" />
                    Duplizieren
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={template.isDefault}
                    onClick={() => void handleSetDefault(template.id)}
                  >
                    <Star data-icon="inline-start" />
                    Standard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDelete(template)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Löschen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
