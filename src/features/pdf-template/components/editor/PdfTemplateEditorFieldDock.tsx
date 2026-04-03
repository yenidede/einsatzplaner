'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PdfTemplateFieldDefinition, PdfTemplateFooterConfig } from '@/features/pdf-template/types';
import type { PdfTemplateFooterTarget } from './PdfTemplateFooterBuilder';
import { PdfTemplateFieldSidebar } from './PdfTemplateFieldSidebar';
import { PdfTemplateCollapsedRail } from './PdfTemplateCollapsedRail';

interface PdfTemplateEditorFieldDockProps {
  isOpen: boolean;
  fields: PdfTemplateFieldDefinition[];
  activeOverlay: 'element' | 'footer' | null;
  activeFooterTarget: PdfTemplateFooterTarget;
  footerConfig: PdfTemplateFooterConfig | null;
  onOpen: () => void;
  onClose: () => void;
  onResizeStart: (clientX: number) => void;
  onInsertField: (field: PdfTemplateFieldDefinition) => void;
  onDragFieldStart: (field: PdfTemplateFieldDefinition) => void;
  onDragFieldEnd: () => void;
}

function getFooterTargetLabel(
  activeOverlay: 'element' | 'footer' | null,
  activeFooterTarget: PdfTemplateFooterTarget,
  footerConfig: PdfTemplateFooterConfig | null
): string | null {
  if (activeOverlay !== 'footer' || !activeFooterTarget.rowId) {
    return null;
  }

  return `Zeile ${Math.max(
    1,
    (footerConfig?.rows.findIndex((row) => row.id === activeFooterTarget.rowId) ??
      0) + 1
  )}${
    footerConfig?.layout === 'two_column'
      ? activeFooterTarget.column === 'left'
        ? ', links'
        : ', rechts'
      : ''
  }`;
}

export function PdfTemplateEditorFieldDock({
  isOpen,
  fields,
  activeOverlay,
  activeFooterTarget,
  footerConfig,
  onOpen,
  onClose,
  onResizeStart,
  onInsertField,
  onDragFieldStart,
  onDragFieldEnd,
}: PdfTemplateEditorFieldDockProps) {
  if (!isOpen) {
    return (
      <PdfTemplateCollapsedRail
        icon={PanelLeftOpen}
        label="Felder"
        buttonAriaLabel="Feldliste ausklappen"
        panelAriaLabel="Verfügbare Felder anzeigen"
        onOpen={onOpen}
        reverseText
      />
    );
  }

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden pr-1.5">
        <div className="relative h-full min-h-0 overflow-hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-3 right-3 z-10 h-8 w-8 rounded-xl border-slate-200 bg-white"
            onClick={onClose}
            aria-label="Feldliste einklappen"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <PdfTemplateFieldSidebar
            fields={fields}
            onInsertField={onInsertField}
            onDragFieldStart={onDragFieldStart}
            onDragFieldEnd={onDragFieldEnd}
            insertionMode={activeOverlay === 'footer' ? 'footer' : 'canvas'}
            footerTargetLabel={getFooterTargetLabel(
              activeOverlay,
              activeFooterTarget,
              footerConfig
            )}
          />
        </div>
      </div>
      <div className="flex h-full min-h-0 items-center justify-center">
        <button
          type="button"
          className="group flex h-full w-full cursor-col-resize items-center justify-center"
          aria-label="Breite der Feldnavigation anpassen"
          onPointerDown={(event) => onResizeStart(event.clientX)}
        >
          <span className="h-24 w-1.5 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400" />
        </button>
      </div>
    </>
  );
}
