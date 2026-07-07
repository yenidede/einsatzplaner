import { ChevronDown, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplateExportDropdown({ controller }: { controller: DocumentTemplateEditorControllerModel }) {
  const { exportingFormat, handleExport } = controller;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exportingFormat !== null}>
          <Download data-icon="inline-start" />
          Exportieren
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleExport('docx')}>
          <FileText data-icon="inline-start" />
          Word-Dokument
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleExport('pdf')}>
          <Download data-icon="inline-start" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
