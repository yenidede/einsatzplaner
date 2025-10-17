import { useState } from 'react';
import { PdfGenerationRequest } from '../types/pdf';
import prisma from '@/lib/prisma';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';

export function usePdfGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = async (request: PdfGenerationRequest) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const einsatz = await getEinsatzWithDetailsById(request.einsatzId);

      if (!einsatz) {
        throw new Error('Einsatz nicht gefunden');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server-Fehler' }));
        throw new Error(errorData.error || `Server-Fehler: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `einsatz_${new Date(einsatz.start).toISOString().split('T')[0]}_${new Date(einsatz.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Fehler beim Erstellen der PDF";
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePdf, isGenerating, error };
}

