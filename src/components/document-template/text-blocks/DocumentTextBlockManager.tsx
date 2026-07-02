'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentTextBlock } from '@/features/document-text-block/types';
import { documentTextBlockQueryKeys } from '@/features/document-text-block/queryKeys';
import {
  createDocumentTextBlock,
  deleteDocumentTextBlock,
  duplicateDocumentTextBlock,
  getDocumentTextBlocks,
  updateDocumentTextBlock,
} from '@/features/document-text-block/server/document-text-block.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DocumentTextBlockDialog } from './DocumentTextBlockDialog';

export function DocumentTextBlockManager({
  organizationId,
}: {
  organizationId: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<DocumentTextBlock | null>(null);
  const { data: textBlocks = [], isLoading } = useQuery({
    queryKey: documentTextBlockQueryKeys.byOrganization(organizationId),
    queryFn: () => getDocumentTextBlocks(organizationId),
  });
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de-AT');
    if (!query) return textBlocks;
    return textBlocks.filter((block) =>
      [block.name, block.description, block.category, block.plainText]
        .join(' ')
        .toLocaleLowerCase('de-AT')
        .includes(query)
    );
  }, [search, textBlocks]);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: documentTextBlockQueryKeys.byOrganization(organizationId),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textbausteine</CardTitle>
        <CardDescription>
          Verwalten Sie wiederverwendbare Absätze und Textbereiche für Ihre
          Dokumentvorlagen.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          <div className="relative min-w-56 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Textbausteine durchsuchen"
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => {
              setSelected(null);
              setDialogOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Neuer Textbaustein
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">
            Textbausteine werden geladen…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
            {search
              ? 'Keine passenden Textbausteine gefunden.'
              : 'Noch keine Textbausteine gespeichert.'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((block) => (
              <Card key={block.id} className="flex min-h-56 flex-col">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {block.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {block.description || 'Keine Beschreibung'}
                      </CardDescription>
                    </div>
                    {block.category ? (
                      <Badge variant="secondary">{block.category}</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 px-4 text-sm">
                  <p className="text-muted-foreground line-clamp-3">
                    {block.plainText}
                  </p>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Aktualisiert am{' '}
                    {block.updatedAt.toLocaleDateString('de-AT')}
                  </p>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-2 p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(block);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil data-icon="inline-start" />
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await duplicateDocumentTextBlock(block.id);
                      toast.success('Textbaustein wurde dupliziert.');
                      await refresh();
                    }}
                  >
                    <Copy data-icon="inline-start" />
                    Duplizieren
                  </Button>
                  <Button
                    className="col-span-2"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Textbaustein „${block.name}“ wirklich löschen?`
                        )
                      )
                        return;
                      await deleteDocumentTextBlock(block.id);
                      toast.success('Textbaustein wurde gelöscht.');
                      await refresh();
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    Löschen
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      <DocumentTextBlockDialog
        open={dialogOpen}
        textBlock={selected}
        onOpenChange={setDialogOpen}
        onSubmit={async (values) => {
          if (selected)
            await updateDocumentTextBlock({ id: selected.id, ...values });
          else await createDocumentTextBlock({ organizationId, ...values });
          toast.success(
            selected
              ? 'Textbaustein wurde aktualisiert.'
              : 'Textbaustein wurde gespeichert.'
          );
          setDialogOpen(false);
          await refresh();
        }}
      />
    </Card>
  );
}
