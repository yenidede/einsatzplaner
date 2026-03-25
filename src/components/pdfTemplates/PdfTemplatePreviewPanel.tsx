'use client';

import { useEffect, useRef } from 'react';
import type { Template } from '@pdfme/common';
import type { PdfTemplateInput } from '@/features/pdf-templates/types';
import { getPdfmePlugins } from '@/features/pdf-templates/pdf-template-default';

interface PdfTemplatePreviewPanelProps {
  template: Template;
  input: PdfTemplateInput;
}

export function PdfTemplatePreviewPanel({
  template,
  input,
}: PdfTemplatePreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<{ destroy: () => void; updateTemplate: (template: Template) => void; setInputs: (inputs: Record<string, string>[]) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeViewer() {
      if (!containerRef.current) {
        return;
      }

      const { Viewer } = await import('@pdfme/ui');

      if (cancelled || !containerRef.current) {
        return;
      }

      viewerRef.current?.destroy();
      viewerRef.current = new Viewer({
        domContainer: containerRef.current,
        template,
        inputs: [Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? JSON.stringify(value) : String(value ?? '')]))],
        options: {
          lang: 'de',
          sidebarOpen: true,
        },
        plugins: getPdfmePlugins(),
      });
    }

    void initializeViewer();

    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.updateTemplate(template);
    viewerRef.current?.setInputs([
      Object.fromEntries(
        Object.entries(input).map(([key, value]) => [
          key,
          Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        ])
      ),
    ]);
  }, [template, input]);

  return (
    <div className="h-full overflow-hidden rounded-md border bg-slate-50">
      <div ref={containerRef} className="h-[calc(100vh-15rem)] min-h-[32rem] w-full" />
    </div>
  );
}
