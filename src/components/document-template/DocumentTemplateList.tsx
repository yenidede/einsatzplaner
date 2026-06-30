'use client';

import { useState } from 'react';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function DocumentTemplateList({
  organizationId,
  templates,
}: {
  organizationId: string;
  templates: DocumentTemplateListItem[];
}) {
  const queryClient = useQueryClient();
  const [templateToDelete, setTemplateToDelete] =
    useState<DocumentTemplateListItem | null>(null);

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
    await deleteDocumentTemplate(template.id);
    toast.success('Dokumentvorlage wurde gelöscht.');
    setTemplateToDelete(null);
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="flex min-h-52 flex-col">
                <CardHeader className="gap-3 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-sm">
                        {template.description || 'Keine Beschreibung'}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {template.isDefault ? <Badge>Standard</Badge> : null}
                      {/* <Badge variant="secondary">DOCX & PDF</Badge> */}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground flex-1 px-4 pb-0 text-xs">
                  Aktualisiert am{' '}
                  {template.updatedAt.toLocaleDateString('de-AT')}
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2 p-4 pt-3 [&_[data-slot=button]]:h-9 [&_[data-slot=button]]:w-full">
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
                  <AlertDialog
                    open={templateToDelete?.id === template.id}
                    onOpenChange={(open) =>
                      setTemplateToDelete(open ? template : null)
                    }
                  >
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 data-icon="inline-start" />
                        Löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Dokumentvorlage löschen?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Die Vorlage „{template.name}“ wird dauerhaft gelöscht.
                          Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleDelete(template)}
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
