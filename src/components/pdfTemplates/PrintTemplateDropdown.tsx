'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generatePdfForAssignment } from '@/app/actions/pdfTemplates';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PdfRenderer } from './PdfRenderer';

interface PrintTemplateDropdownProps {
  organizationId: string;
  assignmentId: string;
  templates: Array<{ id: string; name: string }>;
}

export function PrintTemplateDropdown({
  organizationId,
  assignmentId,
  templates,
}: PrintTemplateDropdownProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [pdfData, setPdfData] = useState<any>(null);

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    const data = await generatePdfForAssignment(
      assignmentId,
      selectedTemplateId
    );
    setPdfData(data);
  };

  return (
    <div className="flex space-x-2">
      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Template auswählen" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleGenerate} disabled={!selectedTemplateId}>
        PDF generieren
      </Button>
      {pdfData && (
        <PDFDownloadLink
          document={
            <PdfRenderer
              content={pdfData.template.contentJson}
              viewModel={pdfData.viewModel}
            />
          }
          fileName="buchungsbestätigung.pdf"
        >
          {({ loading }) => (
            <Button disabled={loading}>
              {loading ? 'Generiere...' : 'Download PDF'}
            </Button>
          )}
        </PDFDownloadLink>
      )}
    </div>
  );
}
