import { useCallback, useState } from "react";
import { generateEinsatzPDF } from "../pdf-action";
import type { PDFActionResult } from "../types/pdf";

interface PdfGenerationRequest {
  einsatzId: string;
}

interface PdfGenerationResult {
  success: boolean;
  filename?: string;
  error?: string;
}

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const link = document.createElement("a");
  const blobUrl = URL.createObjectURL(blob);

  link.href = blobUrl;
  link.download = filename;

  if (typeof link.download === "undefined") {
    link.setAttribute("target", "_blank");
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup memory
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
};

const generatePdfAction = async (
  request: PdfGenerationRequest
): Promise<PdfGenerationResult> => {
  try {
    const result = await generateEinsatzPDF(request.einsatzId);

    if (!result.success || !result.data) {
      throw new Error(result.error || "PDF Generierung fehlgeschlagen");
    }

    const blob = base64ToBlob(result.data.pdf, result.data.mimeType);

    downloadBlob(blob, result.data.filename);

    return {
      success: true,
      filename: result.data.filename,
    };
  } catch (error) {
    console.error("PDF generation error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
};

export function usePdfGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = useCallback(
    async (
      request: PdfGenerationRequest
    ): Promise<PdfGenerationResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const result = await generatePdfAction(request);

        if (!result.success) {
          setError(result.error || "PDF Generierung fehlgeschlagen");
          return null;
        }

        console.log("PDF generated successfully:", result.filename);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unbekannter Fehler";
        setError(errorMessage);
        console.error("Error in generatePdf:", error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    generatePdf,
    isGenerating,
    error,
    reset,
  };
}
export interface UsePdfGeneratorReturn {
  generatePdf: (
    request: PdfGenerationRequest
  ) => Promise<PdfGenerationResult | null>;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
}
