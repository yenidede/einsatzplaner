'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
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

  useEffect(() => {
    let alive = true;

    async function loadTemplates() {
      setIsLoading(true);

      try {
        const nextTemplates = await getPdfTemplatesByOrganization(organizationId);

        if (alive) {
          setTemplates(nextTemplates);
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
    <PdfTemplateList
      templates={templates}
      organizationId={organizationId}
      title="Buchungsbestaetigungen"
      createHref={`/settings/pdf-templates/new?orgId=${organizationId}`}
      emptyMessage="Es gibt noch keine PDF-Vorlagen fuer diese Organisation."
    />
  );
}
