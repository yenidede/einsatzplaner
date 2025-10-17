import { useState, useRef } from 'react';
import { PdfGenerationRequest } from '../types/pdf';

export function usePdfGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const parseFilenameFromContentDisposition = (cd: string | null) => {
    if (!cd) return null;
    // filename*=UTF-8''name or filename="name"
    const fnStar = /filename\*\=UTF-8''([^;]+)/i.exec(cd);
    if (fnStar?.[1]) return decodeURIComponent(fnStar[1].replace(/"/g, ''));
    const fnQuoted = /filename=(?:")?([^";]+)(?:")?/i.exec(cd);
    if (fnQuoted?.[1]) return fnQuoted[1];
    return null;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  };

  const generatePdf = async (request: PdfGenerationRequest) => {
    // ✅ Verhindere doppelte Requests
    if (isGenerating) {
      console.warn('PDF generation already in progress');
      return null;
    }

    // ✅ Cancel vorheriger Request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal, // ✅ Abort-fähig
      });

      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
      const fallback = `einsatz_${request.einsatzId || 'unknown'}_${date}_${time}.pdf`;

      if (!response.ok) {
        // try JSON error body
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const err = await response.json().catch(() => ({ error: `Server-Fehler: ${response.status}` }));
          throw new Error(err?.error || `Server-Fehler: ${response.status}`);
        } else {
          const text = await response.text().catch(() => `Server-Fehler: ${response.status}`);
          throw new Error(text);
        }
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        const text = await response.text().catch(() => 'Unerwarteter Response-Typ');
        throw new Error(text);
      }

      const blob = await response.blob();

      // filename from header if present, otherwise fallback
      const cd = response.headers.get('content-disposition');
      const parsed = parseFilenameFromContentDisposition(cd);
      const filename = parsed || fallback;

      downloadBlob(blob, filename);

      return { success: true };
    } catch (err) {
      // ✅ Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request aborted');
        return null;
      }
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Erstellen der PDF';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return { generatePdf, isGenerating, error };
}

