'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronDown, FileDown, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generatePdfForAssignment } from '@/features/pdf-template/server/pdf-template.actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import TooltipCustom from '@/components/tooltip-custom';

interface GenerateBookingConfirmationButtonProps {
  assignmentId?: string;
  templateId?: string | null;
  templates: Array<{ id: string; name: string }>;
  onTemplateChange: (templateId: string) => void;
  isLoading?: boolean;
}

function downloadBase64Pdf(base64: string, mimeType: string, filename: string) {
  try {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(
      'Die PDF-Datei konnte nicht verarbeitet oder heruntergeladen werden.',
      { cause: error }
    );
  }
}

export function GenerateBookingConfirmationButton({
  assignmentId,
  templateId,
  templates,
  onTemplateChange,
  isLoading = false,
}: GenerateBookingConfirmationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const selectedTemplateName = useMemo(() => {
    return (
      templates.find((template) => template.id === templateId)?.name ?? null
    );
  }, [templateId, templates]);

  const isSelectionDisabled = isLoading || templates.length === 0;
  const canGenerate =
    !isLoading &&
    !isPending &&
    !!assignmentId &&
    !!templateId &&
    templates.length > 0;

  function handleGenerate() {
    if (!canGenerate) {
      return;
    }

    startTransition(async () => {
      const result = await generatePdfForAssignment(
        assignmentId,
        templateId ?? undefined
      );

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'PDF konnte nicht erzeugt werden');
        return;
      }

      try {
        downloadBase64Pdf(
          result.data.pdf,
          result.data.mimeType,
          result.data.filename
        );
        toast.success(
          result.data.source === 'pdfme'
            ? 'Buchungsbestätigung erzeugt'
            : 'Legacy-PDF als Fallback erzeugt'
        );
      } catch (error) {
        console.error('Fehler beim Herunterladen der PDF-Datei:', error);
        toast.error('Die PDF-Datei konnte nicht heruntergeladen werden.');
      }
    });
  }

  return (
    <div className="border-input bg-background flex h-9 overflow-hidden rounded-md border shadow-xs">
      <TooltipCustom text="Buchungsbestätigung generieren">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            'flex min-w-0 items-center gap-2 px-4 text-sm font-medium transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {isPending || isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
        </button>
      </TooltipCustom>

      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="PDF-Vorlage auswählen"
            disabled={isSelectionDisabled}
            className={cn(
              'border-input flex w-11 shrink-0 items-center justify-center border-l transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>PDF-Vorlage</DropdownMenuLabel>
          {selectedTemplateName ? (
            <div className="px-2 pb-2 text-xs text-slate-500">
              Aktiv: {selectedTemplateName}
            </div>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={templateId ?? ''}
            onValueChange={(value) => {
              onTemplateChange(value);
              setIsMenuOpen(false);
            }}
          >
            {templates.map((template) => (
              <DropdownMenuRadioItem key={template.id} value={template.id}>
                {template.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
