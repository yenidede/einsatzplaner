'use client';

import { useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PdfTemplateList } from '@/features/pdf-template/components/list/PdfTemplateList';
import { pdfTemplateQueryKeys } from '@/features/pdf-template/lib/queryKeys';
import { getPdfTemplatesByOrganization } from '@/features/pdf-template/server/pdf-template.actions';
import type { PdfTemplateListItem } from '@/features/pdf-template/types';

interface OrganizationPdfTemplateManagerProps {
  organizationId: string;
}

export function OrganizationPdfTemplateManager({
  organizationId,
}: OrganizationPdfTemplateManagerProps) {
  const { data: templates = [], isLoading, error } = useQuery<
    PdfTemplateListItem[]
  >({
    queryKey: pdfTemplateQueryKeys.byOrganization(organizationId),
    queryFn: async () => {
      try {
        return await getPdfTemplatesByOrganization(organizationId);
      } catch (error) {
        console.error(
          `Fehler beim Laden der PDF-Vorlagen für Organisation ${organizationId}:`,
          error
        );
        toast.error('Die PDF-Vorlagen konnten nicht geladen werden.');
        throw error;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        PDF-Vorlagen werden geladen...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
          Die PDF-Vorlagen konnten nicht geladen werden.
        </div>
      ) : null}

      <PdfTemplateList
        templates={templates}
        organizationId={organizationId}
        title="PDF-Vorlagen"
        emptyMessage="Es gibt noch keine PDF-Vorlagen für diese Organisation."
      />
    </div>
  );
}
