import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PdfGenerationRequest } from '../types/pdf';
import { pdfQueryKeys } from '../queryKeys';

interface PdfGenerationResult {
  success: boolean;
  filename?: string;
  error?: string;
}


const parseFilenameFromContentDisposition = (cd: string | null): string | null => {
  if (!cd) return null;
  
  // RFC 2231: filename*=UTF-8''Buchung_2024.pdf
  const fnStar = /filename\*\=UTF-8''([^;]+)/i.exec(cd);
  if (fnStar?.[1]) {
    return decodeURIComponent(fnStar[1].replace(/"/g, ''));
  }
  
  // Simple: filename="Buchung_2024.pdf"
  const fnQuoted = /filename=(?:")?([^";]+)(?:")?/i.exec(cd);
  if (fnQuoted?.[1]) {
    return fnQuoted[1];
  }
  
  return null;
};


const downloadBlob = (blob: Blob, filename: string): void => {
  const link = document.createElement('a');
  const blobUrl = URL.createObjectURL(blob);
  
  link.href = blobUrl;
  link.download = filename;

  if (typeof link.download === 'undefined') {
    link.setAttribute('target', '_blank');
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup memory
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
};


const generateFallbackFilename = (einsatzId: string): string => {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date()
    .toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '-');
  return `einsatz_${einsatzId}_${date}_${time}.pdf`;
};

const generatePdfApi = async (request: PdfGenerationRequest): Promise<PdfGenerationResult> => {
  const response = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const text = await response.text().catch(() => 'Invalid response type');
    throw new Error(`Erwartete PDF, erhielt ${contentType}: ${text}`);
  }

  const blob = await response.blob();
  
  const cd = response.headers.get('content-disposition');
  const parsedFilename = parseFilenameFromContentDisposition(cd);
  const filename = parsedFilename || generateFallbackFilename(request.einsatzId);

  downloadBlob(blob, filename);

  return { success: true, filename };
};


export function usePdfGenerator() {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationKey: pdfQueryKeys.all,
    mutationFn: generatePdfApi,
    
    onMutate: (variables) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      console.log('Generating PDF with key:', pdfQueryKeys.generate(variables.einsatzId));
    },
    
    onSuccess: (data, variables) => {
      console.log('PDF generated successfully:', data.filename);
      
      queryClient.invalidateQueries({ 
        queryKey: pdfQueryKeys.all 
      });
      
    },
    
    onError: (error: Error, variables) => {
      if (error.name === 'AbortError') {
        console.log('PDF generation aborted for:', pdfQueryKeys.generate(variables.einsatzId));
        return;
      }
      
      console.error('PDF generation failed:', error.message);
    },
    
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });


  const generatePdf = useCallback(
    async (request: PdfGenerationRequest): Promise<PdfGenerationResult | null> => {
      try {
        return await mutation.mutateAsync(request);
      } catch (error) {
        return null;
      }
    },
    [mutation]
  );

  return {
    generatePdf,
    isGenerating: mutation.isPending,
    error: mutation.error?.message || null,
    reset: mutation.reset,
  };
}

export interface UsePdfGeneratorReturn {
  generatePdf: (request: PdfGenerationRequest) => Promise<PdfGenerationResult | null>;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
}

