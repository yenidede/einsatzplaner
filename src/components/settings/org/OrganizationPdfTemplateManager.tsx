'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getPdfTemplatesByOrganization } from '@/app/actions/pdfTemplates';
import { PdfTemplateList } from '@/components/pdfTemplates/PdfTemplateList';
import type { PdfTemplateListItem } from '@/features/pdf-templates/types';

interface OrganizationPdfTemplateManagerProps {
  organizationId: string;
}

export function OrganizationPdfTemplateManager({
  organizationId,
}: OrganizationPdfTemplateManagerProps) {
  const [templates, setTemplates] = useState<PdfTemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadTemplates() {
      setIsLoading(true);
      setError(null);

      try {
        const nextTemplates = await getPdfTemplatesByOrganization(organizationId);

        if (alive) {
          setTemplates(nextTemplates);
        }
      } catch (error) {
        console.error(
          `Fehler beim Laden der PDF-Vorlagen für Organisation ${organizationId}:`,
          error
        );

        if (alive) {
          setError('Die PDF-Vorlagen konnten nicht geladen werden.');
          toast.error('Die PDF-Vorlagen konnten nicht geladen werden.');
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      alive = false;
    };
  }, [organizationId]);

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
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <PdfTemplateList
        templates={templates}
        organizationId={organizationId}
        title="Buchungsbestätigungen"
        createHref={`/settings/pdf-templates/new?orgId=${organizationId}`}
        emptyMessage="Es gibt noch keine PDF-Vorlagen für diese Organisation."
      />
    </div>
  );
}
