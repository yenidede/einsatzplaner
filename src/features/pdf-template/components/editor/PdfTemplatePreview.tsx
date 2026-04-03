'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import type { Template } from '@pdfme/common';
import type { PdfTemplateInput } from '@/features/pdf-template/types';
import { getPdfmePlugins } from '@/features/pdf-template/lib/pdf-template-defaults';
import { cn } from '@/lib/utils';

interface PdfTemplatePreviewProps {
  template: Template;
  input: PdfTemplateInput;
  className?: string;
  viewerClassName?: string;
}

export const PdfTemplatePreview = memo(function PdfTemplatePreview({
  template,
  input,
  className,
  viewerClassName,
}: PdfTemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<{ destroy: () => void; updateTemplate: (template: Template) => void; setInputs: (inputs: Record<string, string>[]) => void } | null>(null);
  const normalizedInput = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(input).map(([key, value]) => [
          key,
          Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        ])
      ),
    [input]
  );

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
        inputs: [normalizedInput],
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
    viewerRef.current?.setInputs([normalizedInput]);
  }, [normalizedInput, template]);

  return (
    <div
      className={cn(
        'h-full overflow-hidden rounded-md border bg-slate-50',
        className
      )}
    >
      <div
        ref={containerRef}
        className={cn('h-[calc(100vh-15rem)] min-h-[32rem] w-full', viewerClassName)}
      />
    </div>
  );
});

export { PdfTemplatePreview as PdfTemplatePreviewPanel };
