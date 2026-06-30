'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  exportDocumentTemplateForAssignment,
  getDocumentTemplatesByOrganization,
} from '@/features/document-template/server/document-template.actions';
import { documentTemplateQueryKeys } from '@/features/document-template/queryKeys';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function downloadBase64File(
  base64: string,
  mimeType: string,
  filename: string
) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function GenerateDocumentTemplateButtons({
  assignmentId,
  organizationId,
}: {
  assignmentId?: string | null;
  organizationId?: string | null;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [exportingFormat, setExportingFormat] = useState<'docx' | 'pdf' | null>(
    null
  );
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx'>('pdf');
  const { data: templates = [], isLoading } = useQuery({
    queryKey: organizationId
      ? documentTemplateQueryKeys.byOrganization(organizationId)
      : documentTemplateQueryKeys.byOrganization('missing-organization'),
    queryFn: () =>
      organizationId
        ? getDocumentTemplatesByOrganization(organizationId)
        : Promise.resolve([]),
    enabled: Boolean(organizationId),
  });
  const activeTemplates = templates.filter((template) => template.isActive);
  const effectiveTemplateId = useMemo(() => {
    if (
      selectedTemplateId &&
      activeTemplates.some((template) => template.id === selectedTemplateId)
    ) {
      return selectedTemplateId;
    }

    return (
      activeTemplates.find((template) => template.isDefault)?.id ??
      activeTemplates[0]?.id ??
      null
    );
  }, [activeTemplates, selectedTemplateId]);

  async function handleExport(format: 'docx' | 'pdf') {
    if (!assignmentId || !effectiveTemplateId) {
      toast.error(
        'Bitte speichern Sie den Einsatz und wählen Sie eine Vorlage aus.'
      );
      return;
    }

    setExportingFormat(format);
    const result = await exportDocumentTemplateForAssignment({
      assignmentId,
      templateId: effectiveTemplateId,
      format,
    });
    setExportingFormat(null);

    if (!result.success || !result.data) {
      toast.error(result.error ?? 'Das Dokument konnte nicht erzeugt werden.');
      return;
    }

    downloadBase64File(
      result.data.file,
      result.data.mimeType,
      result.data.filename
    );
    toast.success(format === 'docx' ? 'Word-Dokument erzeugt' : 'PDF erzeugt');
  }

  if (isLoading || activeTemplates.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download data-icon="inline-start" />
          Dokumentvorlage exportieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-140">
        <DialogHeader>
          <DialogTitle>Dokumentvorlage exportieren</DialogTitle>
          <DialogDescription>
            Wählen Sie eine neue Dokumentvorlage und das gewünschte Dateiformat.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Vorlage</label>
            <Select
              value={effectiveTemplateId ?? ''}
              onValueChange={(value) => setSelectedTemplateId(value)}
            >
              <SelectTrigger aria-label="Dokumentvorlage">
                <SelectValue placeholder="Dokumentvorlage wählen" />
              </SelectTrigger>
              <SelectContent>
                {activeTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Format</label>
            <Select
              value={selectedFormat}
              onValueChange={(value) => {
                if (value === 'pdf' || value === 'docx') {
                  setSelectedFormat(value);
                }
              }}
            >
              <SelectTrigger aria-label="Format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="docx">Word (.docx)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void handleExport(selectedFormat)}
            disabled={exportingFormat !== null}
          >
            <Download data-icon="inline-start" />
            Datei erstellen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
