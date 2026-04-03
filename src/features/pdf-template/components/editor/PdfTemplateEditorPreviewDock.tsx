'use client';

import { PanelRightOpen } from 'lucide-react';
import type { Template } from '@pdfme/common';
import type { PdfTemplateInput } from '@/features/pdf-template/types';
import { PdfTemplateCollapsedRail } from './PdfTemplateCollapsedRail';
import { PdfTemplateInspector } from './PdfTemplateInspector';
import { PdfTemplateResizeHandle } from './PdfTemplateResizeHandle';

interface PdfTemplateEditorPreviewDockProps {
  isOpen: boolean;
  previewAssignments: Array<{ id: string; title: string }>;
  selectedPreviewEinsatzId: string;
  onSelectPreviewEinsatzId: (value: string) => void;
  onRefreshPreview: () => void;
  isRefreshingPreview: boolean;
  onOpen: () => void;
  onClose: () => void;
  onResizeStart: (clientX: number) => void;
  template: Template;
  input: PdfTemplateInput;
}

export function PdfTemplateEditorPreviewDock({
  isOpen,
  previewAssignments,
  selectedPreviewEinsatzId,
  onSelectPreviewEinsatzId,
  onRefreshPreview,
  isRefreshingPreview,
  onOpen,
  onClose,
  onResizeStart,
  template,
  input,
}: PdfTemplateEditorPreviewDockProps) {
  if (!isOpen) {
    return (
      <>
        <div className="h-full min-h-0" aria-hidden="true" />
        <PdfTemplateCollapsedRail
          icon={PanelRightOpen}
          label="Vorschau"
          buttonAriaLabel="Seitenleiste ausklappen"
          panelAriaLabel="Vorschau und Einstellungen anzeigen"
          onOpen={onOpen}
        />
      </>
    );
  }

  return (
    <>
      <PdfTemplateResizeHandle
        ariaLabel="Breite der rechten Seitenleiste anpassen"
        onResizeStart={onResizeStart}
      />
      <PdfTemplateInspector
        previewAssignments={previewAssignments}
        selectedPreviewEinsatzId={selectedPreviewEinsatzId}
        onSelectPreviewEinsatzId={onSelectPreviewEinsatzId}
        onRefreshPreview={onRefreshPreview}
        isRefreshingPreview={isRefreshingPreview}
        onCollapse={onClose}
        template={template}
        input={input}
      />
    </>
  );
}
