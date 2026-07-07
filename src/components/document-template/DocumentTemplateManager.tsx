'use client';

import { useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getDocumentTemplatesByOrganization } from '@/features/document-template/server/document-template.actions';
import { documentTemplateQueryKeys } from '@/features/document-template/queryKeys';
import type { DocumentTemplateListItem } from '@/features/document-template/types';
import { DocumentTemplateList } from './DocumentTemplateList';
import { DocumentTextBlockManager } from './text-blocks/DocumentTextBlockManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DocumentTemplateManager({
  organizationId,
}: {
  organizationId: string;
}) {
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery<DocumentTemplateListItem[]>({
    queryKey: documentTemplateQueryKeys.byOrganization(organizationId),
    queryFn: async () => {
      try {
        return await getDocumentTemplatesByOrganization(organizationId);
      } catch (error) {
        toast.error('Die Dokumentvorlagen konnten nicht geladen werden.');
        throw error;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm">
        <LoaderCircle className="animate-spin" />
        Dokumentvorlagen werden geladen...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
        Die Dokumentvorlagen konnten nicht geladen werden.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2 className="text-xl font-semibold">Dokumentvorlagen</h2>
        <p className="text-muted-foreground text-sm">
          Erstellen und verwalten Sie Vorlagen und Textbausteine, die für Word und PDF verwendet werden können.
        </p>
      </header>
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Vorlagen</TabsTrigger>
          <TabsTrigger value="text-blocks">Textbausteine</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <DocumentTemplateList organizationId={organizationId} templates={templates} />
        </TabsContent>
        <TabsContent value="text-blocks">
          <DocumentTextBlockManager organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
