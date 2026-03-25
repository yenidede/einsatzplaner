'use client';

import { useTransition } from 'react';
import { FileDown, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generatePdfForAssignment } from '@/app/actions/pdfTemplates';

interface GenerateBookingConfirmationButtonProps {
  assignmentId?: string;
}

function downloadBase64Pdf(base64: string, mimeType: string, filename: string) {
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
}

export function GenerateBookingConfirmationButton({
  assignmentId,
}: GenerateBookingConfirmationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!assignmentId) {
      return;
    }

    startTransition(async () => {
      const result = await generatePdfForAssignment(assignmentId);

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'PDF konnte nicht erzeugt werden');
        return;
      }

      downloadBase64Pdf(
        result.data.pdf,
        result.data.mimeType,
        result.data.filename
      );
      toast.success(
        result.data.source === 'pdfme'
          ? 'Buchungsbestaetigung erzeugt'
          : 'Legacy-PDF als Fallback erzeugt'
      );
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleGenerate} disabled={!assignmentId || isPending}>
      {isPending ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      Buchungsbestaetigung generieren
    </Button>
  );
}
