import { useState } from 'react';
import { toast } from 'sonner';
import type { DocumentTemplateContent } from '@/features/document-template/types';
import { exportDocumentTemplatePreview } from '@/features/document-template/server/document-template.actions';
import { downloadBase64File } from '../utils/documentTemplateEditorUtils';

type ExportFormat = 'docx' | 'pdf';

export function useDocumentTemplateExport({
  organizationId,
  name,
  currentContent,
}: {
  organizationId: string;
  name: string;
  currentContent: () => DocumentTemplateContent;
}) {
  const [exportingFormat, setExportingFormat] =
    useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    try {
      setExportingFormat(format);
      const result = await exportDocumentTemplatePreview({
        organizationId,
        name,
        content: currentContent(),
        format,
      });

      if (!result.success || !result.data) {
        toast.error(
          result.error ?? 'Das Dokument konnte nicht erzeugt werden.'
        );
        return;
      }

      downloadBase64File(
        result.data.file,
        result.data.mimeType,
        result.data.filename
      );
      toast.success(
        format === 'docx' ? 'Word-Dokument erzeugt' : 'PDF erzeugt'
      );
    } finally {
      setExportingFormat(null);
    }
  }

  return { exportingFormat, handleExport };
}
