'use client';

import { PDFViewer } from '@react-pdf/renderer';
import { PdfTemplateContent } from '@/types/pdfTemplate';
import { PdfRenderer } from './PdfRenderer';

const mockViewModel = {
  organization: {
    name: 'Beispiel Organisation',
    email: 'info@beispiel.de',
    phone: '0123 456789',
    signatureName: 'Max Mustermann',
    signatureRole: 'Leiter',
  },
  assignment: {
    groupName: 'Gruppe A',
    programName: 'Programm 1',
    formattedDate: 'Donnerstag, 19. März 2026',
    formattedTimeRange: '07:20 Uhr – 11:05 Uhr',
    formattedDateTimeRange: 'Donnerstag, 19. März 2026, 07:20 Uhr – 11:05 Uhr',
    participantSummary: '0 Erwachsene / Senioren',
    priceSummary: '€ 9/Person bzw. € 0 bei 0 Teilnehmer:innen',
  },
};

interface TemplatePreviewProps {
  content: PdfTemplateContent;
}

export function TemplatePreview({ content }: TemplatePreviewProps) {
  return (
    <div className="h-full">
      <h3 className="mb-2 text-lg font-bold">Live-Vorschau</h3>
      <PDFViewer width="100%" height="600">
        <PdfRenderer content={content} viewModel={mockViewModel} />
      </PDFViewer>
    </div>
  );
}
