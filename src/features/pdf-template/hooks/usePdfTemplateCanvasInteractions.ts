'use client';

import { useCallback, type DragEvent, type MouseEvent, type MutableRefObject, type PointerEvent, type RefObject } from 'react';
import { toast } from 'sonner';
import { insertFieldIntoTemplate } from '@/features/pdf-template/lib/insert-field-into-template';
import {
  createClientId,
  getDesignerPageElementForIndex,
  getDraggedFieldKey,
  getHotspotAtPoint,
  getSchemaKey,
  PDF_PAGE_HEIGHT_MM,
  PDF_PAGE_WIDTH_MM,
  sanitizeBaseTemplate,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';
import {
  createDefaultFooterConfig,
  FOOTER_LIBRARY_FIELD_KEY,
} from '@/features/pdf-template/lib/pdf-template-footer';
import type {
  CanvasSchemaHotspot,
  ActiveOverlay,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFooterConfig,
} from '@/features/pdf-template/types';
import type { PdfTemplateFooterTarget } from '@/features/pdf-template/components/editor/PdfTemplateFooterBuilder';
import type { Template } from '@pdfme/common';

interface DropPosition {
  x: number;
  y: number;
}

interface UsePdfTemplateCanvasInteractionsOptions {
  editorCanvasRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  lastOverlayTriggerRef: MutableRefObject<HTMLElement | null>;
  templateRef: MutableRefObject<Template>;
  canvasSchemaHotspots: CanvasSchemaHotspot[];
  currentPageIndex: number;
  setCurrentPageIndex: (value: number) => void;
  setSelectedElementKey: (value: string | null) => void;
  setIsFooterSelected: (value: boolean) => void;
  activeOverlay: ActiveOverlay;
  setActiveOverlay: (value: ActiveOverlay) => void;
  footerConfig: PdfTemplateFooterConfig | null;
  setFooterConfig: (value: PdfTemplateFooterConfig | null) => void;
  activeFooterTarget: PdfTemplateFooterTarget;
  setActiveFooterTarget: (value: PdfTemplateFooterTarget) => void;
  draggedFieldKey: string | null;
  setDraggedFieldKey: (value: string | null) => void;
  setIsCanvasDropActive: (value: boolean) => void;
  fieldMap: Map<string, PdfTemplateFieldDefinition>;
  gridSize: number;
  snapToGrid: boolean;
  getCurrentDesignerTemplate: () => Template;
  getCurrentPageCursor: () => number;
  commitTemplateChange: (
    nextTemplate: Template,
    nextSelectedKey?: string | null
  ) => void;
}

interface UsePdfTemplateCanvasInteractionsResult {
  handleInsertField: (
    field: PdfTemplateFieldDefinition,
    position?: DropPosition
  ) => void;
  handleCanvasDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleCanvasDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleCanvasDrop: (event: DragEvent<HTMLDivElement>) => void;
  handleCanvasPointerDownCapture: (
    event: PointerEvent<HTMLDivElement>
  ) => void;
  handleCanvasDoubleClickCapture: (event: MouseEvent<HTMLDivElement>) => void;
  handleCanvasContextMenuCapture: (event: MouseEvent<HTMLDivElement>) => void;
  openFooterOverlay: (triggerElement?: HTMLElement | null) => void;
}

export function usePdfTemplateCanvasInteractions({
  editorCanvasRef,
  containerRef,
  lastOverlayTriggerRef,
  templateRef,
  canvasSchemaHotspots,
  currentPageIndex,
  setCurrentPageIndex,
  setSelectedElementKey,
  setIsFooterSelected,
  activeOverlay,
  setActiveOverlay,
  footerConfig,
  setFooterConfig,
  activeFooterTarget,
  setActiveFooterTarget,
  draggedFieldKey,
  setDraggedFieldKey,
  setIsCanvasDropActive,
  fieldMap,
  gridSize,
  snapToGrid,
  getCurrentDesignerTemplate,
  getCurrentPageCursor,
  commitTemplateChange,
}: UsePdfTemplateCanvasInteractionsOptions): UsePdfTemplateCanvasInteractionsResult {
  const openElementOverlay = useCallback(
    (elementKey: string, triggerElement?: HTMLElement | null) => {
      setSelectedElementKey(elementKey);
      lastOverlayTriggerRef.current = triggerElement ?? null;
      setActiveOverlay('element');
    },
    [lastOverlayTriggerRef, setActiveOverlay, setSelectedElementKey]
  );

  const openFooterOverlay = useCallback(
    (triggerElement?: HTMLElement | null) => {
      const nextFooter =
        footerConfig ?? createDefaultFooterConfig(currentPageIndex);
      const focusedRow =
        nextFooter.rows.find((row) => row.id === activeFooterTarget.rowId) ??
        nextFooter.rows[0] ??
        null;

      if (!footerConfig) {
        setFooterConfig(nextFooter);
      }

      if (focusedRow) {
        setActiveFooterTarget({
          rowId: focusedRow.id,
          column:
            nextFooter.layout === 'two_column'
              ? activeFooterTarget.column
              : 'left',
        });
      }

      lastOverlayTriggerRef.current = triggerElement ?? null;
      setActiveOverlay('footer');
    },
    [
      activeFooterTarget.column,
      activeFooterTarget.rowId,
      currentPageIndex,
      footerConfig,
      lastOverlayTriggerRef,
      setActiveFooterTarget,
      setActiveOverlay,
      setFooterConfig,
    ]
  );

  const insertFooterToken = useCallback(
    (field: PdfTemplateFieldDefinition) => {
      const baseFooter =
        footerConfig ?? createDefaultFooterConfig(currentPageIndex);
      const targetRow =
        baseFooter.rows.find((row) => row.id === activeFooterTarget.rowId) ??
        baseFooter.rows[0] ??
        null;

      const rowId = targetRow?.id ?? null;
      const desiredColumn =
        baseFooter.layout === 'two_column' ? activeFooterTarget.column : 'left';
      const nextRows =
        rowId === null
          ? [
              {
                id: createClientId('row'),
                column: desiredColumn,
                separator: 'pipe' as const,
                segments: [
                  {
                    id: createClientId('segment'),
                    text: `{${field.key}}`,
                  },
                ],
              },
            ]
          : baseFooter.rows.map((row) =>
              row.id === rowId
                ? {
                    ...row,
                    column: desiredColumn,
                    segments: [
                      ...row.segments,
                      {
                        id: createClientId('segment'),
                        text: `{${field.key}}`,
                      },
                    ],
                  }
                : row
            );

      const nextFooter: PdfTemplateFooterConfig = {
        ...baseFooter,
        pageIndex: currentPageIndex,
        rows: nextRows,
      };

      setFooterConfig(nextFooter);
      setActiveFooterTarget({
        rowId: rowId ?? nextRows[0]?.id ?? null,
        column: desiredColumn,
      });
    },
    [
      activeFooterTarget.column,
      activeFooterTarget.rowId,
      currentPageIndex,
      footerConfig,
      setActiveFooterTarget,
      setFooterConfig,
    ]
  );

  const getDropPosition = useCallback(
    (event: DragEvent<HTMLDivElement>): DropPosition | null => {
      const pageElement = getDesignerPageElementForIndex(
        containerRef.current,
        currentPageIndex
      );

      if (!pageElement) {
        return null;
      }

      const rect = pageElement.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;

      if (
        relativeX < 0 ||
        relativeY < 0 ||
        relativeX > rect.width ||
        relativeY > rect.height
      ) {
        return null;
      }

      const rawPosition = {
        x: (relativeX / rect.width) * PDF_PAGE_WIDTH_MM,
        y: (relativeY / rect.height) * PDF_PAGE_HEIGHT_MM,
      };

      if (!snapToGrid) {
        return rawPosition;
      }

      return {
        x: Math.round(rawPosition.x / gridSize) * gridSize,
        y: Math.round(rawPosition.y / gridSize) * gridSize,
      };
    },
    [containerRef, currentPageIndex, gridSize, snapToGrid]
  );

  const handleInsertField = useCallback(
    (field: PdfTemplateFieldDefinition, position?: DropPosition) => {
      if (activeOverlay === 'footer' && field.key !== FOOTER_LIBRARY_FIELD_KEY) {
        insertFooterToken(field);
        toast.success(`${field.label} wurde in den Footer eingefügt`);
        return;
      }

      if (field.key === FOOTER_LIBRARY_FIELD_KEY) {
        const pageIndex = getCurrentPageCursor();
        const nextFooter = footerConfig ?? createDefaultFooterConfig(pageIndex);
        setCurrentPageIndex(pageIndex);
        setFooterConfig(nextFooter);
        setActiveFooterTarget({
          rowId: nextFooter.rows[0]?.id ?? null,
          column:
            nextFooter.layout === 'two_column'
              ? (nextFooter.rows[0]?.column ?? 'left')
              : 'left',
        });
        setActiveOverlay('footer');
        toast.success('Footer-Bereich wurde aktiviert');
        return;
      }

      const currentTemplate = sanitizeBaseTemplate(
        getCurrentDesignerTemplate() ?? templateRef.current
      );
      const pageCursor = getCurrentPageCursor();
      setCurrentPageIndex(pageCursor);

      const insertedTemplate = insertFieldIntoTemplate({
        template: currentTemplate,
        field,
        pageIndex: pageCursor,
        position,
      });
      const insertedPage = insertedTemplate.schemas[pageCursor] ?? [];
      const insertedSchema = insertedPage[insertedPage.length - 1];
      const insertedKey = insertedSchema
        ? getSchemaKey(insertedSchema, pageCursor, insertedPage.length - 1)
        : null;

      commitTemplateChange(insertedTemplate, insertedKey);
      setActiveOverlay('element');
      toast.success(`${field.label} wurde eingefügt`);
    },
    [
      activeOverlay,
      commitTemplateChange,
      footerConfig,
      getCurrentDesignerTemplate,
      getCurrentPageCursor,
      insertFooterToken,
      setActiveFooterTarget,
      setActiveOverlay,
      setCurrentPageIndex,
      setFooterConfig,
      templateRef,
    ]
  );

  const handleCanvasPointerDownCapture = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!editorCanvasRef.current) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('[data-footer-zone="true"]')
      ) {
        setIsFooterSelected(true);
        setSelectedElementKey(null);
        return;
      }

      if (
        target instanceof HTMLElement &&
        target.closest('[data-overlay-trigger="true"]')
      ) {
        return;
      }

      const canvasRect = editorCanvasRef.current.getBoundingClientRect();
      const relativeX = event.clientX - canvasRect.left;
      const relativeY = event.clientY - canvasRect.top;
      const hotspot = getHotspotAtPoint(
        canvasSchemaHotspots,
        relativeX,
        relativeY
      );

      if (hotspot) {
        setSelectedElementKey(hotspot.key);
        setIsFooterSelected(false);
        return;
      }

      setIsFooterSelected(false);
    },
    [
      canvasSchemaHotspots,
      editorCanvasRef,
      setIsFooterSelected,
      setSelectedElementKey,
    ]
  );

  const handleCanvasDoubleClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!editorCanvasRef.current) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest('[data-overlay-trigger="true"]') ||
          target.closest('[data-footer-zone="true"]'))
      ) {
        return;
      }

      const canvasRect = editorCanvasRef.current.getBoundingClientRect();
      const relativeX = event.clientX - canvasRect.left;
      const relativeY = event.clientY - canvasRect.top;
      const hotspot = getHotspotAtPoint(
        canvasSchemaHotspots,
        relativeX,
        relativeY
      );

      if (!hotspot) {
        return;
      }

      event.preventDefault();
      setIsFooterSelected(false);
      openElementOverlay(
        hotspot.key,
        target instanceof HTMLElement ? target : null
      );
    },
    [canvasSchemaHotspots, editorCanvasRef, openElementOverlay, setIsFooterSelected]
  );

  const handleCanvasContextMenuCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!editorCanvasRef.current) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest('[data-overlay-trigger="true"]') ||
          target.closest('[data-footer-zone="true"]'))
      ) {
        return;
      }

      const canvasRect = editorCanvasRef.current.getBoundingClientRect();
      const relativeX = event.clientX - canvasRect.left;
      const relativeY = event.clientY - canvasRect.top;
      const hotspot = getHotspotAtPoint(
        canvasSchemaHotspots,
        relativeX,
        relativeY
      );

      if (!hotspot) {
        return;
      }

      event.preventDefault();
      setIsFooterSelected(false);
      openElementOverlay(
        hotspot.key,
        target instanceof HTMLElement ? target : null
      );
    },
    [canvasSchemaHotspots, editorCanvasRef, openElementOverlay, setIsFooterSelected]
  );

  const handleCanvasDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const fieldKey = draggedFieldKey ?? getDraggedFieldKey(event);

      if (!fieldKey || !fieldMap.has(fieldKey)) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsCanvasDropActive(true);
    },
    [draggedFieldKey, fieldMap, setIsCanvasDropActive]
  );

  const handleCanvasDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const relatedTarget = event.relatedTarget;

      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return;
      }

      setIsCanvasDropActive(false);
    },
    [setIsCanvasDropActive]
  );

  const handleCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const fieldKey = draggedFieldKey ?? getDraggedFieldKey(event);
      const field = fieldKey ? fieldMap.get(fieldKey) : null;
      const position = getDropPosition(event);

      setDraggedFieldKey(null);
      setIsCanvasDropActive(false);

      if (!field || !position) {
        return;
      }

      handleInsertField(field, position);
    },
    [
      draggedFieldKey,
      fieldMap,
      getDropPosition,
      handleInsertField,
      setDraggedFieldKey,
      setIsCanvasDropActive,
    ]
  );

  return {
    handleInsertField,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleCanvasPointerDownCapture,
    handleCanvasDoubleClickCapture,
    handleCanvasContextMenuCapture,
    openFooterOverlay,
  };
}
