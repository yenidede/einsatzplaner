'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { type Template } from '@pdfme/common';
import { PanelLeftClose, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  createPdfTemplate,
  getPdfPreviewInput,
  updatePdfTemplate,
} from '@/app/actions/pdfTemplates';
import { PdfTemplateCanvasWorkspace } from './PdfTemplateCanvasWorkspace';
import { PdfTemplateEditorTopBar } from './PdfTemplateEditorTopBar';
import { PdfTemplateElementInspectorOverlay } from './PdfTemplateElementInspectorOverlay';
import { PdfTemplateFieldSidebar } from './PdfTemplateFieldSidebar';
import {
  PdfTemplateFooterInlineEditor,
  type PdfTemplateFooterTarget,
} from './PdfTemplateFooterInlineEditor';
import { PdfTemplateInspectorSidebar } from './PdfTemplateInspectorSidebar';
import {
  getPdfmePlugins,
  isLegacyPdfTemplateBlankBasePdf,
  PDF_TEMPLATE_BLANK_BASE_PDF,
} from '@/features/pdf-templates/pdf-template-default';
import {
  applyFooterToTemplate,
  buildFooterLayout,
  buildFooterLibraryField,
  createDefaultFooterConfig,
  FOOTER_LIBRARY_FIELD_KEY,
  stripFooterSchemas,
} from '@/features/pdf-templates/pdf-template-footer';
import { applyImageBindingsToTemplate } from '@/features/pdf-templates/pdf-template-image-binding';
import { insertFieldIntoTemplate } from '@/features/pdf-templates/insert-field-into-template';
import { pdfTemplateQueryKeys } from '@/features/pdf-templates/queryKeys';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFooterConfig,
  PdfTemplateInput,
} from '@/features/pdf-templates/types';
import { cn } from '@/lib/utils';

interface PdfmeTemplateEditorProps {
  organizationId: string;
  templateId?: string;
  initialName: string;
  initialTemplate: Template;
  initialFooterConfig: PdfTemplateFooterConfig | null;
  initialSampleEinsatzId: string | null;
  previewAssignments: Array<{ id: string; title: string }>;
  fields: PdfTemplateFieldDefinition[];
}

type DesignerInstance = {
  destroy: () => void;
  getTemplate: () => Template;
  updateTemplate: (template: Template) => void;
  getPageCursor: () => number;
};

interface DropPosition {
  x: number;
  y: number;
}

type Alignment = 'left' | 'center' | 'right';

interface ElementOption {
  key: string;
  label: string;
  meta: string;
}

interface SelectedElementState {
  key: string;
  label: string;
  schemaName: string;
  type: string;
  content: string;
  boundFieldKey: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  opacity: number;
  isEditable: boolean;
  fontSize: number;
  fontColor: string;
  letterSpacing: number;
  isBold: boolean;
  align: Alignment;
  formatHint: string | null;
}

type TemplateSchema = Template['schemas'][number][number];
type ActiveOverlay = 'element' | 'footer' | null;

interface OverlayAnchor {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FloatingOverlayRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

type OverlayPlacementMode = 'anchored' | 'manual';

interface OverlayPanelLayout {
  mode: OverlayPlacementMode;
  rect: FloatingOverlayRect;
}

interface PendingCanvasInteraction {
  kind: 'element';
  elementKey: string;
  triggerElement: HTMLElement | null;
  startX: number;
  startY: number;
}

interface CanvasSchemaHotspot {
  key: string;
  pageIndex: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function getDefaultOverlayLayout(
  kind: Exclude<ActiveOverlay, null>
): OverlayPanelLayout {
  if (kind === 'footer') {
    return {
      mode: 'anchored',
      rect: {
        top: OVERLAY_VIEWPORT_MARGIN_PX,
        left: OVERLAY_VIEWPORT_MARGIN_PX,
        width: 640,
        maxHeight: 640,
      },
    };
  }

  return {
    mode: 'anchored',
    rect: {
      top: OVERLAY_VIEWPORT_MARGIN_PX,
      left: OVERLAY_VIEWPORT_MARGIN_PX,
      width: 400,
      maxHeight: 420,
    },
  };
}

const COLLAPSED_PANEL_WIDTH = 64;
const RESIZE_HANDLE_WIDTH = 10;
const MIN_LEFT_PANEL_WIDTH = 252;
const MIN_RIGHT_PANEL_WIDTH = 320;
const MIN_EDITOR_WIDTH = 840;
const DEFAULT_GRID_SIZE = 5;
const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 40;
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const LEFT_CANVAS_MARGIN_MM = 20;
const RIGHT_CANVAS_MARGIN_MM = 20;
const OVERLAY_VIEWPORT_MARGIN_PX = 16;
const OVERLAY_ANCHOR_GAP_PX = 12;
const FOOTER_OVERLAY_MIN_WIDTH_PX = 480;
const FOOTER_OVERLAY_MAX_WIDTH_PX = 760;
const FOOTER_OVERLAY_MIN_HEIGHT_PX = 360;
const ELEMENT_OVERLAY_MIN_WIDTH_PX = 320;
const ELEMENT_OVERLAY_MAX_WIDTH_PX = 520;
const ELEMENT_OVERLAY_MIN_HEIGHT_PX = 260;
const EMPTY_PREVIEW_INPUT: PdfTemplateInput = {};
const WORKSPACE_BOTTOM_GAP_PX = 1;
const WORKSPACE_MIN_RESERVED_VIEWPORT_PX = 50;
const FOOTER_HIGHLIGHT_PADDING_X_MM = 2.5;
const FOOTER_HIGHLIGHT_PADDING_Y_MM = 1.5;

function getDockedEditorMinWidth(viewportWidth: number): number {
  if (viewportWidth >= 1680) {
    return MIN_EDITOR_WIDTH;
  }

  if (viewportWidth >= 1440) {
    return 720;
  }

  if (viewportWidth >= 1200) {
    return 600;
  }

  return 460;
}

function getDesignerPageElementForIndex(
  container: HTMLDivElement | null,
  pageIndex: number
): HTMLDivElement | null {
  return getDesignerPageElements(container)[pageIndex] ?? null;
}

function getDesignerPageElements(
  container: HTMLDivElement | null
): HTMLDivElement[] {
  return container
    ? Array.from(
        container.querySelectorAll<HTMLDivElement>(
          'div[style*="background-size"][style*="position: relative"]'
        )
      )
    : [];
}

function buildAnchorViewportRect(
  canvas: HTMLDivElement,
  anchor: OverlayAnchor
): {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  const canvasRect = canvas.getBoundingClientRect();
  const top = canvasRect.top + anchor.y;
  const left = canvasRect.left + anchor.x;
  const width = anchor.width;
  const height = anchor.height;

  return {
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function intersectsViewport(
  rect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  },
  margin: number
): boolean {
  return (
    rect.right > margin &&
    rect.bottom > margin &&
    rect.left < window.innerWidth - margin &&
    rect.top < window.innerHeight - margin
  );
}

function getHotspotAtPoint(
  hotspots: CanvasSchemaHotspot[],
  clientX: number,
  clientY: number
): CanvasSchemaHotspot | null {
  for (let index = hotspots.length - 1; index >= 0; index -= 1) {
    const hotspot = hotspots[index];
    const right = hotspot.x + hotspot.width;
    const bottom = hotspot.y + hotspot.height;

    if (
      clientX >= hotspot.x &&
      clientX <= right &&
      clientY >= hotspot.y &&
      clientY <= bottom
    ) {
      return hotspot;
    }
  }

  return null;
}

function estimateFooterContentWidthMm(
  text: string,
  fontSize: number,
  maxWidth: number
): number {
  const longestLineLength = text
    .split('\n')
    .reduce((maxLength, line) => Math.max(maxLength, line.trim().length), 0);

  return Math.max(12, Math.min(maxWidth, longestLineLength * fontSize * 0.23));
}

function getDraggedFieldKey(event: DragEvent<HTMLDivElement>): string | null {
  const customFieldKey = event.dataTransfer.getData(
    'application/pdf-template-field'
  );

  if (customFieldKey) {
    return customFieldKey;
  }

  const plainFieldKey = event.dataTransfer.getData('text/plain');
  return plainFieldKey || null;
}

function getSchemaKey(
  schema: TemplateSchema,
  pageIndex: number,
  schemaIndex: number
): string {
  return typeof schema.id === 'string'
    ? schema.id
    : `${pageIndex}:${schemaIndex}:${schema.name}`;
}

function getElementLabel(schema: TemplateSchema, schemaIndex: number): string {
  const content =
    typeof schema.content === 'string'
      ? schema.content.replace(/[{}]/g, '')
      : '';

  return content || schema.name || `Element ${schemaIndex + 1}`;
}

function parseBoundFieldKey(schema: TemplateSchema): string | null {
  const content = typeof schema.content === 'string' ? schema.content : '';
  const match = content.match(/^\{(.+)\}$/);
  return match ? match[1] : null;
}

function detectFormatHint(boundFieldKey: string | null): string | null {
  if (!boundFieldKey) {
    return null;
  }

  if (boundFieldKey.includes('datum') || boundFieldKey.includes('zeit')) {
    return 'Datumsformat (automatisch)';
  }

  if (boundFieldKey.includes('preis') || boundFieldKey.includes('betrag')) {
    return 'Währungsformat (automatisch)';
  }

  return 'Standardformat';
}

function getSchemaAlignment(schema: TemplateSchema): Alignment {
  const centeredX = (PDF_PAGE_WIDTH_MM - schema.width) / 2;
  const rightX = PDF_PAGE_WIDTH_MM - RIGHT_CANVAS_MARGIN_MM - schema.width;

  if (Math.abs(schema.position.x - centeredX) <= 2) {
    return 'center';
  }

  if (Math.abs(schema.position.x - rightX) <= 2) {
    return 'right';
  }

  return 'left';
}

function buildSelectedElementState(
  template: Template,
  selectedElementKey: string | null
): SelectedElementState | null {
  if (!selectedElementKey) {
    return null;
  }

  for (const [pageIndex, page] of template.schemas.entries()) {
    for (const [schemaIndex, schema] of page.entries()) {
      if (getSchemaKey(schema, pageIndex, schemaIndex) !== selectedElementKey) {
        continue;
      }

      return {
        key: selectedElementKey,
        label: getElementLabel(schema, schemaIndex),
        schemaName: schema.name,
        type: schema.type,
        content: typeof schema.content === 'string' ? schema.content : '',
        boundFieldKey: parseBoundFieldKey(schema),
        x: schema.position.x,
        y: schema.position.y,
        width: schema.width,
        height: schema.height,
        rotate: typeof schema.rotate === 'number' ? schema.rotate : 0,
        opacity: typeof schema.opacity === 'number' ? schema.opacity : 1,
        isEditable: schema.readOnly !== true,
        fontSize: typeof schema.fontSize === 'number' ? schema.fontSize : 11,
        fontColor:
          typeof schema.fontColor === 'string' ? schema.fontColor : '#0f172a',
        letterSpacing:
          typeof schema.lineHeight === 'number' ? schema.lineHeight : 0,
        isBold:
          typeof schema.fontName === 'string'
            ? schema.fontName.toLowerCase().includes('bold')
            : false,
        align: getSchemaAlignment(schema),
        formatHint: detectFormatHint(parseBoundFieldKey(schema)),
      };
    }
  }

  return null;
}

function getSelectedElementPageIndex(
  template: Template,
  selectedElementKey: string | null
): number | null {
  if (!selectedElementKey) {
    return null;
  }

  for (const [pageIndex, page] of template.schemas.entries()) {
    for (const [schemaIndex, schema] of page.entries()) {
      if (getSchemaKey(schema, pageIndex, schemaIndex) === selectedElementKey) {
        return pageIndex;
      }
    }
  }

  return null;
}

function compareTemplates(left: Template, right: Template): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createClientId(prefix: string): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeBlankBasePdf(template: Template): Template {
  return isLegacyPdfTemplateBlankBasePdf(template.basePdf)
    ? {
        ...template,
        basePdf: PDF_TEMPLATE_BLANK_BASE_PDF,
      }
    : template;
}

function sanitizeBaseTemplate(template: Template): Template {
  return stripFooterSchemas(
    applyFooterToTemplate({
      template: normalizeBlankBasePdf(template),
      footer: null,
    })
  );
}

export function PdfmeTemplateEditor({
  organizationId,
  templateId,
  initialName,
  initialTemplate,
  initialFooterConfig,
  initialSampleEinsatzId,
  previewAssignments,
  fields,
}: PdfmeTemplateEditorProps) {
  const normalizedInitialTemplate = useMemo(
    () => sanitizeBaseTemplate(initialTemplate),
    [initialTemplate]
  );
  const router = useRouter();
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const layoutViewportRef = useRef<HTMLDivElement | null>(null);
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);
  const editorCanvasRef = useRef<HTMLDivElement | null>(null);
  const footerZoneRef = useRef<HTMLDivElement | null>(null);
  const overlayPanelRef = useRef<HTMLDivElement | null>(null);
  const overlayLayoutsRef = useRef<
    Record<Exclude<ActiveOverlay, null>, OverlayPanelLayout>
  >({
    element: getDefaultOverlayLayout('element'),
    footer: getDefaultOverlayLayout('footer'),
  });
  const overlayInteractionFrameRef = useRef<number | null>(null);
  const liveOverlayRectRef = useRef<FloatingOverlayRect | null>(null);
  const footerZoneDragFrameRef = useRef<number | null>(null);
  const liveFooterZoneOffsetRef = useRef(0);
  const lastOverlayTriggerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const designerRef = useRef<DesignerInstance | null>(null);
  const templateRef = useRef<Template>(normalizedInitialTemplate);
  const isApplyingTemplateRef = useRef(false);
  const baselineTemplateRef = useRef<Template>(normalizedInitialTemplate);
  const baselineNameRef = useRef(initialName);
  const baselineFooterRef = useRef<PdfTemplateFooterConfig | null>(
    initialFooterConfig
  );
  const baselineSampleRef = useRef<string | null>(initialSampleEinsatzId);
  const appliedDesignerTemplateRef = useRef<Template>(
    applyFooterToTemplate({
      template: normalizedInitialTemplate,
      footer: initialFooterConfig,
      input: EMPTY_PREVIEW_INPUT,
    })
  );
  const footerConfigRef = useRef<PdfTemplateFooterConfig | null>(
    initialFooterConfig
  );
  const previewInputRef = useRef<PdfTemplateInput>(EMPTY_PREVIEW_INPUT);

  const [name, setName] = useState(initialName);
  const [template, setTemplate] = useState<Template>(normalizedInitialTemplate);
  const [footerConfig, setFooterConfig] =
    useState<PdfTemplateFooterConfig | null>(initialFooterConfig);
  const [selectedPreviewEinsatzId, setSelectedPreviewEinsatzId] =
    useState<string>(initialSampleEinsatzId ?? 'mock');
  const [isFieldSidebarOpen, setIsFieldSidebarOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [gridOverlayStyle, setGridOverlayStyle] =
    useState<CSSProperties | null>(null);
  const [workspaceViewportOffset, setWorkspaceViewportOffset] = useState(0);
  const [layoutViewportWidth, setLayoutViewportWidth] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(296);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [draggedFieldKey, setDraggedFieldKey] = useState<string | null>(null);
  const [isCanvasDropActive, setIsCanvasDropActive] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<Template[]>([]);
  const [redoStack, setRedoStack] = useState<Template[]>([]);
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(
    null
  );
  const [isFooterSelected, setIsFooterSelected] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [overlayAnchor, setOverlayAnchor] = useState<OverlayAnchor | null>(
    null
  );
  const [overlayViewportStyle, setOverlayViewportStyle] =
    useState<CSSProperties | null>(null);
  const [overlayLayouts, setOverlayLayouts] = useState<
    Record<Exclude<ActiveOverlay, null>, OverlayPanelLayout>
  >({
    element: getDefaultOverlayLayout('element'),
    footer: getDefaultOverlayLayout('footer'),
  });
  const [activeFooterTarget, setActiveFooterTarget] =
    useState<PdfTemplateFooterTarget>({
      rowId: null,
      column: 'left',
    });
  const [isSaving, startSaving] = useTransition();

  const previewInputQuery = useQuery<PdfTemplateInput>({
    queryKey: pdfTemplateQueryKeys.previewInput(
      selectedPreviewEinsatzId === 'mock' ? null : selectedPreviewEinsatzId
    ),
    queryFn: () =>
      getPdfPreviewInput(
        selectedPreviewEinsatzId === 'mock' ? null : selectedPreviewEinsatzId
      ),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const previewInput = previewInputQuery.data ?? EMPTY_PREVIEW_INPUT;
  const deferredFooterConfig = useDeferredValue(footerConfig);
  const deferredPreviewInput = useDeferredValue(previewInput);
  const libraryFields = useMemo(
    () => [...fields, buildFooterLibraryField()],
    [fields]
  );
  const fieldMap = useMemo(
    () => new Map(libraryFields.map((field) => [field.key, field])),
    [libraryFields]
  );
  const renderedTemplate = useMemo(() => {
    const footerTemplate = applyFooterToTemplate({
      template,
      footer: deferredFooterConfig,
      input: deferredPreviewInput,
    });

    return applyImageBindingsToTemplate({
      template: footerTemplate,
      input: deferredPreviewInput,
    });
  }, [template, deferredFooterConfig, deferredPreviewInput]);

  useEffect(() => {
    overlayLayoutsRef.current = overlayLayouts;
  }, [overlayLayouts]);

  useEffect(() => {
    footerConfigRef.current = footerConfig;
  }, [footerConfig]);

  useEffect(() => {
    previewInputRef.current = previewInput;
  }, [previewInput]);

  const elementOptions = useMemo<ElementOption[]>(() => {
    return template.schemas.flatMap((page, pageIndex) =>
      page.map((schema, schemaIndex) => ({
        key: getSchemaKey(schema, pageIndex, schemaIndex),
        label: getElementLabel(schema, schemaIndex),
        meta: `Seite ${pageIndex + 1} • ${schema.type}`,
      }))
    );
  }, [template]);

  const selectedElement = useMemo(
    () => buildSelectedElementState(template, selectedElementKey),
    [template, selectedElementKey]
  );
  const selectedElementPageIndex = useMemo(
    () => getSelectedElementPageIndex(template, selectedElementKey),
    [template, selectedElementKey]
  );
  const canvasSchemaHotspots = useMemo<CanvasSchemaHotspot[]>(() => {
    if (!gridOverlayStyle) {
      return [];
    }

    const overlayTop =
      typeof gridOverlayStyle.top === 'number' ? gridOverlayStyle.top : null;
    const overlayLeft =
      typeof gridOverlayStyle.left === 'number' ? gridOverlayStyle.left : null;
    const overlayWidth =
      typeof gridOverlayStyle.width === 'number'
        ? gridOverlayStyle.width
        : null;
    const overlayHeight =
      typeof gridOverlayStyle.height === 'number'
        ? gridOverlayStyle.height
        : null;

    if (
      overlayTop === null ||
      overlayLeft === null ||
      overlayWidth === null ||
      overlayHeight === null
    ) {
      return [];
    }

    const page = template.schemas[currentPageIndex] ?? [];

    return page.map((schema, schemaIndex) => ({
      key: getSchemaKey(schema, currentPageIndex, schemaIndex),
      pageIndex: currentPageIndex,
      label: getElementLabel(schema, schemaIndex),
      x: overlayLeft + (schema.position.x / PDF_PAGE_WIDTH_MM) * overlayWidth,
      y: overlayTop + (schema.position.y / PDF_PAGE_HEIGHT_MM) * overlayHeight,
      width: Math.max((schema.width / PDF_PAGE_WIDTH_MM) * overlayWidth, 24),
      height: Math.max(
        (schema.height / PDF_PAGE_HEIGHT_MM) * overlayHeight,
        20
      ),
    }));
  }, [currentPageIndex, gridOverlayStyle, template.schemas]);

  const isDirty = useMemo(() => {
    if (name !== baselineNameRef.current) {
      return true;
    }

    if (
      (selectedPreviewEinsatzId === 'mock'
        ? null
        : selectedPreviewEinsatzId) !== baselineSampleRef.current
    ) {
      return true;
    }

    if (
      JSON.stringify(footerConfig) !== JSON.stringify(baselineFooterRef.current)
    ) {
      return true;
    }

    return !compareTemplates(template, baselineTemplateRef.current);
  }, [footerConfig, name, selectedPreviewEinsatzId, template]);

  const saveStateLabel = isDirty ? 'Ungespeicherte Änderungen' : 'Gespeichert';

  const closeActiveOverlay = useCallback(() => {
    setActiveOverlay(null);
    setOverlayAnchor(null);
    liveOverlayRectRef.current = null;
    if (overlayInteractionFrameRef.current !== null) {
      window.cancelAnimationFrame(overlayInteractionFrameRef.current);
      overlayInteractionFrameRef.current = null;
    }
    window.setTimeout(() => {
      lastOverlayTriggerRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    setCurrentPageIndex((current) =>
      Math.min(current, Math.max(template.schemas.length - 1, 0))
    );
  }, [template.schemas.length]);

  useEffect(() => {
    if (!selectedElementKey && elementOptions[0]) {
      setSelectedElementKey(elementOptions[0].key);
      return;
    }

    if (
      selectedElementKey &&
      !elementOptions.some((option) => option.key === selectedElementKey)
    ) {
      setSelectedElementKey(elementOptions[0]?.key ?? null);
    }
  }, [elementOptions, selectedElementKey]);

  useEffect(() => {
    if (!footerConfig?.enabled) {
      setActiveFooterTarget({
        rowId: null,
        column: 'left',
      });
      return;
    }

    const matchingRow =
      footerConfig.rows.find((row) => row.id === activeFooterTarget.rowId) ??
      footerConfig.rows[0];

    if (!matchingRow) {
      setActiveFooterTarget({
        rowId: null,
        column: 'left',
      });
      return;
    }

    const nextColumn =
      footerConfig.layout === 'two_column' ? activeFooterTarget.column : 'left';

    if (
      matchingRow.id !== activeFooterTarget.rowId ||
      nextColumn !== activeFooterTarget.column
    ) {
      setActiveFooterTarget({
        rowId: matchingRow.id,
        column: nextColumn,
      });
    }
  }, [activeFooterTarget.column, activeFooterTarget.rowId, footerConfig]);

  useEffect(() => {
    let cancelled = false;

    async function initializeDesigner() {
      if (!containerRef.current) {
        return;
      }

      const { Designer } = await import('@pdfme/ui');

      if (cancelled || !containerRef.current) {
        return;
      }

      designerRef.current?.destroy();

      const initialRenderedTemplate = applyFooterToTemplate({
        template: templateRef.current,
        footer: footerConfigRef.current,
        input: previewInputRef.current,
      });

      const instance = new Designer({
        domContainer: containerRef.current,
        template: initialRenderedTemplate,
        options: {
          lang: 'de',
          zoomLevel: 1,
          sidebarOpen: true,
        },
        plugins: getPdfmePlugins(),
      });

      appliedDesignerTemplateRef.current = initialRenderedTemplate;

      instance.onChangeTemplate((changedTemplate) => {
        const strippedTemplate = stripFooterSchemas(changedTemplate);
        const normalizedTemplate = sanitizeBaseTemplate(strippedTemplate);
        const previousTemplate = templateRef.current;
        appliedDesignerTemplateRef.current = applyFooterToTemplate({
          template: normalizedTemplate,
          footer: footerConfigRef.current,
          input: previewInputRef.current,
        });

        if (compareTemplates(previousTemplate, normalizedTemplate)) {
          isApplyingTemplateRef.current = false;
          return;
        }

        if (!isApplyingTemplateRef.current) {
          setUndoStack((current) => [...current.slice(-39), previousTemplate]);
          setRedoStack([]);
        }

        isApplyingTemplateRef.current = false;
        templateRef.current = normalizedTemplate;
        setTemplate(normalizedTemplate);
      });
      instance.onPageChange(({ currentPage }) => {
        setCurrentPageIndex(currentPage);
      });
      setCurrentPageIndex(instance.getPageCursor());
      designerRef.current = {
        destroy: () => instance.destroy(),
        getTemplate: () => instance.getTemplate(),
        updateTemplate: (nextTemplate) => instance.updateTemplate(nextTemplate),
        getPageCursor: () => instance.getPageCursor(),
      };
    }

    void initializeDesigner();

    return () => {
      cancelled = true;
      designerRef.current?.destroy();
      designerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!designerRef.current) {
      return;
    }

    if (
      compareTemplates(appliedDesignerTemplateRef.current, renderedTemplate)
    ) {
      return;
    }

    isApplyingTemplateRef.current = true;
    appliedDesignerTemplateRef.current = renderedTemplate;
    designerRef.current.updateTemplate(renderedTemplate);
  }, [renderedTemplate]);

  useEffect(() => {
    function syncWorkspaceViewportOffset() {
      const nextTop =
        workspaceGridRef.current?.getBoundingClientRect().top ?? 0;
      setWorkspaceViewportOffset(Math.max(Math.round(nextTop), 0));
    }

    syncWorkspaceViewportOffset();

    const resizeObserver = new ResizeObserver(syncWorkspaceViewportOffset);

    if (topBarRef.current) {
      resizeObserver.observe(topBarRef.current);
    }

    if (layoutViewportRef.current) {
      resizeObserver.observe(layoutViewportRef.current);
    }

    window.addEventListener('resize', syncWorkspaceViewportOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncWorkspaceViewportOffset);
    };
  }, []);

  useEffect(() => {
    function syncLayoutViewportWidth() {
      setLayoutViewportWidth(
        layoutViewportRef.current?.clientWidth ?? window.innerWidth
      );
    }

    syncLayoutViewportWidth();

    const resizeObserver = new ResizeObserver(syncLayoutViewportWidth);

    if (layoutViewportRef.current) {
      resizeObserver.observe(layoutViewportRef.current);
    }

    window.addEventListener('resize', syncLayoutViewportWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncLayoutViewportWidth);
    };
  }, []);

  useEffect(() => {
    function syncGridOverlay() {
      const editorCanvasElement = editorCanvasRef.current;
      const designerContainer = containerRef.current;

      if (!editorCanvasElement || !designerContainer) {
        setGridOverlayStyle(null);
        return;
      }

      const pageElement = getDesignerPageElementForIndex(
        designerContainer,
        currentPageIndex
      );

      if (!pageElement) {
        setGridOverlayStyle(null);
        return;
      }

      const canvasRect = editorCanvasElement.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();

      setGridOverlayStyle({
        top: pageRect.top - canvasRect.top,
        left: pageRect.left - canvasRect.left,
        width: pageRect.width,
        height: pageRect.height,
      });
    }

    syncGridOverlay();

    const resizeObserver = new ResizeObserver(syncGridOverlay);

    if (editorCanvasRef.current) {
      resizeObserver.observe(editorCanvasRef.current);
    }

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const mutationObserver = new MutationObserver(syncGridOverlay);

    if (containerRef.current) {
      mutationObserver.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    window.addEventListener('resize', syncGridOverlay);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', syncGridOverlay);
    };
  }, [currentPageIndex, template, zoomLevel]);

  function applyTemplate(
    nextTemplate: Template,
    nextSelectedKey?: string | null
  ) {
    const nextRenderedTemplate = applyFooterToTemplate({
      template: nextTemplate,
      footer: footerConfig,
      input: previewInput,
    });

    isApplyingTemplateRef.current = true;
    appliedDesignerTemplateRef.current = nextRenderedTemplate;
    designerRef.current?.updateTemplate(nextRenderedTemplate);
    templateRef.current = nextTemplate;
    setTemplate(nextTemplate);

    if (typeof nextSelectedKey !== 'undefined') {
      setSelectedElementKey(nextSelectedKey);
    }
  }

  function commitTemplateChange(
    nextTemplate: Template,
    nextSelectedKey?: string | null
  ) {
    if (compareTemplates(templateRef.current, nextTemplate)) {
      return;
    }

    setUndoStack((current) => [...current.slice(-39), templateRef.current]);
    setRedoStack([]);
    applyTemplate(nextTemplate, nextSelectedKey);
  }

  function updateSelectedSchema(
    updater: (schema: TemplateSchema) => TemplateSchema
  ) {
    if (!selectedElementKey) {
      return;
    }

    const nextTemplate: Template = {
      ...templateRef.current,
      schemas: templateRef.current.schemas.map((page, pageIndex) =>
        page.map((schema, schemaIndex) => {
          if (
            getSchemaKey(schema, pageIndex, schemaIndex) !== selectedElementKey
          ) {
            return schema;
          }

          return updater(schema);
        })
      ),
    };

    commitTemplateChange(nextTemplate, selectedElementKey);
  }

  function openElementOverlay(
    elementKey: string,
    triggerElement?: HTMLElement | null
  ) {
    setSelectedElementKey(elementKey);
    lastOverlayTriggerRef.current = triggerElement ?? null;
    setActiveOverlay('element');
  }

  function openFooterOverlay(triggerElement?: HTMLElement | null) {
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
  }

  function insertFooterToken(field: PdfTemplateFieldDefinition) {
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
  }

  const refreshPreview = useCallback(async () => {
    const nextTemplate = designerRef.current?.getTemplate();

    if (!nextTemplate) {
      return;
    }

    setTemplate(sanitizeBaseTemplate(nextTemplate));
    await previewInputQuery.refetch();
  }, [previewInputQuery]);
  const handleRefreshPreview = useCallback(() => {
    void refreshPreview();
  }, [refreshPreview]);
  const closePreviewSidebar = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);
  const handleCanvasPointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
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
    [canvasSchemaHotspots]
  );
  const handleCanvasDoubleClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
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
    [canvasSchemaHotspots]
  );
  const handleCanvasContextMenuCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
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
    [canvasSchemaHotspots]
  );

  function getDropPosition(
    event: DragEvent<HTMLDivElement>
  ): DropPosition | null {
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
  }

  function handleInsertField(
    field: PdfTemplateFieldDefinition,
    position?: DropPosition
  ) {
    if (activeOverlay === 'footer' && field.key !== FOOTER_LIBRARY_FIELD_KEY) {
      insertFooterToken(field);
      toast.success(`„${field.label}“ wurde in den Footer eingefügt`);
      return;
    }

    if (field.key === FOOTER_LIBRARY_FIELD_KEY) {
      const pageIndex =
        designerRef.current?.getPageCursor() ?? currentPageIndex;
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
      designerRef.current?.getTemplate() ?? templateRef.current
    );
    const pageCursor = designerRef.current?.getPageCursor() ?? 0;
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
    toast.success(`„${field.label}“ wurde eingefügt`);
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    const fieldKey = draggedFieldKey ?? getDraggedFieldKey(event);

    if (!fieldKey || !fieldMap.has(fieldKey)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsCanvasDropActive(true);
  }

  function handleCanvasDragLeave(event: DragEvent<HTMLDivElement>) {
    const relatedTarget = event.relatedTarget;

    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }

    setIsCanvasDropActive(false);
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
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
  }

  async function saveTemplate() {
    startSaving(async () => {
      try {
        const currentTemplate = sanitizeBaseTemplate(
          designerRef.current?.getTemplate() ?? templateRef.current
        );
        const sampleEinsatzId =
          selectedPreviewEinsatzId === 'mock' ? null : selectedPreviewEinsatzId;
        const payload = {
          name,
          template: currentTemplate,
          sampleEinsatzId,
          footer: footerConfig,
        };

        if (templateId) {
          await updatePdfTemplate(templateId, payload);
          baselineTemplateRef.current = currentTemplate;
          baselineNameRef.current = name;
          baselineFooterRef.current = footerConfig;
          baselineSampleRef.current = sampleEinsatzId;
          setTemplate(currentTemplate);
          toast.success('Vorlage gespeichert');
          router.refresh();
          return;
        }

        const created = await createPdfTemplate({
          organizationId,
          ...payload,
        });

        baselineTemplateRef.current = currentTemplate;
        baselineNameRef.current = name;
        baselineFooterRef.current = footerConfig;
        baselineSampleRef.current = sampleEinsatzId;
        toast.success('Vorlage erstellt');
        router.push(
          `/settings/pdf-templates/${created.id}/edit?orgId=${organizationId}`
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Vorlage konnte nicht gespeichert werden'
        );
      }
    });
  }

  function undoTemplateChange() {
    const previous = undoStack[undoStack.length - 1];

    if (!previous) {
      return;
    }

    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, templateRef.current]);
    applyTemplate(previous);
  }

  function redoTemplateChange() {
    const next = redoStack[redoStack.length - 1];

    if (!next) {
      return;
    }

    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, templateRef.current]);
    applyTemplate(next);
  }

  function startResize(side: 'left' | 'right', clientX: number) {
    const initialX = clientX;
    const initialLeftWidth = leftPanelWidth;
    const initialRightWidth = rightPanelWidth;
    const availableWidth =
      layoutViewportRef.current?.clientWidth ?? window.innerWidth;
    const minEditorWidth = getDockedEditorMinWidth(availableWidth);
    const leftHandleWidth = isFieldSidebarOpen ? RESIZE_HANDLE_WIDTH : 0;
    const rightHandleWidth = isPreviewOpen ? RESIZE_HANDLE_WIDTH : 0;
    const maxLeftWidth = Math.max(
      MIN_LEFT_PANEL_WIDTH,
      availableWidth -
        initialRightWidth -
        leftHandleWidth -
        rightHandleWidth -
        minEditorWidth
    );
    const maxRightWidth = Math.max(
      MIN_RIGHT_PANEL_WIDTH,
      availableWidth -
        initialLeftWidth -
        leftHandleWidth -
        rightHandleWidth -
        minEditorWidth
    );

    function handlePointerMove(event: PointerEvent) {
      const delta = event.clientX - initialX;

      if (side === 'left') {
        const nextWidth = Math.min(
          maxLeftWidth,
          Math.max(MIN_LEFT_PANEL_WIDTH, initialLeftWidth + delta)
        );
        setLeftPanelWidth(nextWidth);
        return;
      }

      const nextWidth = Math.min(
        maxRightWidth,
        Math.max(MIN_RIGHT_PANEL_WIDTH, initialRightWidth - delta)
      );
      setRightPanelWidth(nextWidth);
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  const currentLeftWidth = isFieldSidebarOpen
    ? leftPanelWidth
    : COLLAPSED_PANEL_WIDTH;
  const currentRightWidth = isPreviewOpen
    ? rightPanelWidth
    : COLLAPSED_PANEL_WIDTH;
  const leftHandleWidth = isFieldSidebarOpen ? RESIZE_HANDLE_WIDTH : 0;
  const rightHandleWidth = isPreviewOpen ? RESIZE_HANDLE_WIDTH : 0;
  const gridPatternSize = `${Math.max(gridSize * 6, 18)}px`;
  const dockedEditorMinWidth = getDockedEditorMinWidth(
    layoutViewportWidth || MIN_EDITOR_WIDTH
  );
  const editorSurfaceMaxWidth = '100%';
  const workspaceHeight = `calc(100vh - ${Math.max(
    workspaceViewportOffset + WORKSPACE_BOTTOM_GAP_PX,
    WORKSPACE_MIN_RESERVED_VIEWPORT_PX
  )}px)`;
  const workspaceContainerStyle = useMemo(
    () => ({ height: workspaceHeight }),
    [workspaceHeight]
  );
  const footerZoneLayoutConfig = useMemo(
    () => footerConfig ?? createDefaultFooterConfig(currentPageIndex),
    [currentPageIndex, footerConfig]
  );
  const isFooterActiveOnCurrentPage =
    footerConfig?.enabled === true &&
    footerConfig.pageIndex === currentPageIndex;
  const footerInteractiveZoneStyle = useMemo(() => {
    if (!gridOverlayStyle) {
      return null;
    }

    const overlayTop =
      typeof gridOverlayStyle.top === 'number' ? gridOverlayStyle.top : null;
    const overlayLeft =
      typeof gridOverlayStyle.left === 'number' ? gridOverlayStyle.left : null;
    const overlayWidth =
      typeof gridOverlayStyle.width === 'number'
        ? gridOverlayStyle.width
        : null;
    const overlayHeight =
      typeof gridOverlayStyle.height === 'number'
        ? gridOverlayStyle.height
        : null;

    if (
      overlayTop === null ||
      overlayLeft === null ||
      overlayWidth === null ||
      overlayHeight === null
    ) {
      return null;
    }

    const layout = buildFooterLayout(
      footerZoneLayoutConfig,
      deferredPreviewInput
    );
    if (layout.items.length === 0) {
      return null;
    }

    const itemBounds = layout.items.map((item) => {
      const contentWidth = estimateFooterContentWidthMm(
        item.text,
        item.fontSize,
        item.width
      );
      const leftMm =
        item.alignment === 'center'
          ? item.x + (item.width - contentWidth) / 2
          : item.x;

      return {
        left: leftMm,
        right: leftMm + contentWidth,
        top: item.y,
        bottom: item.y + item.height,
      };
    });

    const minLeftMm = Math.max(
      0,
      Math.min(...itemBounds.map((bounds) => bounds.left)) -
        FOOTER_HIGHLIGHT_PADDING_X_MM
    );
    const maxRightMm = Math.min(
      PDF_PAGE_WIDTH_MM,
      Math.max(...itemBounds.map((bounds) => bounds.right)) +
        FOOTER_HIGHLIGHT_PADDING_X_MM
    );
    const minTopMm = Math.max(
      0,
      Math.min(...itemBounds.map((bounds) => bounds.top)) -
        FOOTER_HIGHLIGHT_PADDING_Y_MM
    );
    const maxBottomMm = Math.min(
      PDF_PAGE_HEIGHT_MM,
      Math.max(...itemBounds.map((bounds) => bounds.bottom)) +
        FOOTER_HIGHLIGHT_PADDING_Y_MM
    );

    const top = overlayTop + (minTopMm / PDF_PAGE_HEIGHT_MM) * overlayHeight;
    const left = overlayLeft + (minLeftMm / PDF_PAGE_WIDTH_MM) * overlayWidth;
    const right = overlayLeft + (maxRightMm / PDF_PAGE_WIDTH_MM) * overlayWidth;
    const bottom =
      overlayTop + (maxBottomMm / PDF_PAGE_HEIGHT_MM) * overlayHeight;

    return {
      top,
      left,
      width: Math.max(right - left, 24),
      height: Math.max(bottom - top, 22),
    };
  }, [deferredPreviewInput, footerZoneLayoutConfig, gridOverlayStyle]);
  const footerZoneStyle = isFooterActiveOnCurrentPage
    ? footerInteractiveZoneStyle
    : null;
  const updateOverlayViewportPosition = useCallback(() => {
    if (!activeOverlay || !overlayAnchor || !editorCanvasRef.current) {
      setOverlayViewportStyle(null);
      return;
    }

    const anchorRect = buildAnchorViewportRect(
      editorCanvasRef.current,
      overlayAnchor
    );
    const canvasRect = editorCanvasRef.current.getBoundingClientRect();

    if (
      !intersectsViewport(anchorRect, OVERLAY_VIEWPORT_MARGIN_PX) ||
      anchorRect.right < canvasRect.left ||
      anchorRect.left > canvasRect.right ||
      anchorRect.bottom < canvasRect.top ||
      anchorRect.top > canvasRect.bottom
    ) {
      setOverlayViewportStyle(null);
      setActiveOverlay(null);
      setOverlayAnchor(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const savedLayout = overlayLayoutsRef.current[activeOverlay];
    const minWidth =
      activeOverlay === 'footer'
        ? FOOTER_OVERLAY_MIN_WIDTH_PX
        : ELEMENT_OVERLAY_MIN_WIDTH_PX;
    const maxWidthLimit =
      activeOverlay === 'footer'
        ? FOOTER_OVERLAY_MAX_WIDTH_PX
        : ELEMENT_OVERLAY_MAX_WIDTH_PX;
    const minHeight =
      activeOverlay === 'footer'
        ? FOOTER_OVERLAY_MIN_HEIGHT_PX
        : ELEMENT_OVERLAY_MIN_HEIGHT_PX;
    const preferredWidth =
      activeOverlay === 'footer'
        ? Math.min(
            Math.max(viewportWidth * 0.42, 560),
            FOOTER_OVERLAY_MAX_WIDTH_PX
          )
        : Math.min(
            Math.max(viewportWidth * 0.28, 320),
            ELEMENT_OVERLAY_MAX_WIDTH_PX
          );
    const defaultLayout = getDefaultOverlayLayout(activeOverlay);
    const width = Math.min(
      Math.max(
        savedLayout.rect.width === defaultLayout.rect.width
          ? preferredWidth
          : savedLayout.rect.width,
        minWidth
      ),
      Math.min(maxWidthLimit, viewportWidth - OVERLAY_VIEWPORT_MARGIN_PX * 2)
    );
    const maxHeight = Math.min(
      Math.max(
        savedLayout.rect.maxHeight === defaultLayout.rect.maxHeight
          ? Math.min(viewportHeight * 0.8, defaultLayout.rect.maxHeight)
          : savedLayout.rect.maxHeight,
        minHeight
      ),
      viewportHeight - OVERLAY_VIEWPORT_MARGIN_PX * 2
    );
    const measuredHeight = Math.min(
      overlayPanelRef.current?.offsetHeight ??
        (activeOverlay === 'footer' ? maxHeight : Math.max(360, minHeight)),
      maxHeight
    );

    let left = savedLayout.rect.left;
    let top = savedLayout.rect.top;

    if (savedLayout.mode === 'anchored') {
      left = anchorRect.right + OVERLAY_ANCHOR_GAP_PX;
      if (left + width > viewportWidth - OVERLAY_VIEWPORT_MARGIN_PX) {
        left = anchorRect.left - width - OVERLAY_ANCHOR_GAP_PX;
      }
      if (left < OVERLAY_VIEWPORT_MARGIN_PX) {
        left = Math.max(
          OVERLAY_VIEWPORT_MARGIN_PX,
          Math.min(
            anchorRect.left,
            viewportWidth - width - OVERLAY_VIEWPORT_MARGIN_PX
          )
        );
      }

      const preferredTop =
        activeOverlay === 'footer'
          ? anchorRect.top
          : anchorRect.top + anchorRect.height / 2 - measuredHeight / 2;
      top = Math.max(
        OVERLAY_VIEWPORT_MARGIN_PX,
        Math.min(
          preferredTop,
          viewportHeight - measuredHeight - OVERLAY_VIEWPORT_MARGIN_PX
        )
      );
    } else {
      left = Math.max(
        OVERLAY_VIEWPORT_MARGIN_PX,
        Math.min(left, viewportWidth - width - OVERLAY_VIEWPORT_MARGIN_PX)
      );
      top = Math.max(
        OVERLAY_VIEWPORT_MARGIN_PX,
        Math.min(
          top,
          viewportHeight - measuredHeight - OVERLAY_VIEWPORT_MARGIN_PX
        )
      );
    }

    setOverlayViewportStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxHeight,
      zIndex: 80,
    });
  }, [activeOverlay, overlayAnchor]);

  useEffect(() => {
    if (activeOverlay === 'element') {
      if (
        !selectedElementKey ||
        selectedElementPageIndex !== currentPageIndex
      ) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      const hotspot = canvasSchemaHotspots.find(
        (item) => item.key === selectedElementKey
      );

      if (!hotspot) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      setOverlayAnchor({
        pageIndex: hotspot.pageIndex,
        x: hotspot.x,
        y: hotspot.y,
        width: hotspot.width,
        height: hotspot.height,
      });
      return;
    }

    if (activeOverlay === 'footer') {
      if (
        !footerConfig?.enabled ||
        footerConfig.pageIndex !== currentPageIndex ||
        !footerInteractiveZoneStyle
      ) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      setOverlayAnchor({
        pageIndex: currentPageIndex,
        x: footerInteractiveZoneStyle.left,
        y: footerInteractiveZoneStyle.top,
        width: footerInteractiveZoneStyle.width,
        height: footerInteractiveZoneStyle.height,
      });
      return;
    }

    setOverlayAnchor(null);
  }, [
    activeOverlay,
    canvasSchemaHotspots,
    currentPageIndex,
    footerConfig,
    footerInteractiveZoneStyle,
    selectedElementKey,
    selectedElementPageIndex,
  ]);

  useLayoutEffect(() => {
    if (!activeOverlay) {
      setOverlayViewportStyle(null);
      return;
    }

    updateOverlayViewportPosition();

    const handleViewportChange = () => {
      window.requestAnimationFrame(updateOverlayViewportPosition);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    const canvasElement = editorCanvasRef.current;
    const overlayElement = overlayPanelRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleViewportChange())
        : null;

    if (canvasElement && resizeObserver) {
      resizeObserver.observe(canvasElement);
    }

    if (overlayElement && resizeObserver) {
      resizeObserver.observe(overlayElement);
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.visualViewport?.removeEventListener(
        'resize',
        handleViewportChange
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        handleViewportChange
      );
      resizeObserver?.disconnect();
    };
  }, [activeOverlay, updateOverlayViewportPosition, zoomLevel]);

  const applyOverlayRectToDom = useCallback((rect: FloatingOverlayRect) => {
    if (!overlayPanelRef.current) {
      return;
    }

    overlayPanelRef.current.style.top = `${rect.top}px`;
    overlayPanelRef.current.style.left = `${rect.left}px`;
    overlayPanelRef.current.style.width = `${rect.width}px`;
    overlayPanelRef.current.style.maxHeight = `${rect.maxHeight}px`;
  }, []);

  const commitOverlayLayout = useCallback(
    (
      overlay: Exclude<ActiveOverlay, null>,
      rect: FloatingOverlayRect,
      nextMode?: OverlayPlacementMode
    ) => {
      setOverlayLayouts((current) => ({
        ...current,
        [overlay]: {
          mode: nextMode ?? current[overlay].mode,
          rect,
        },
      }));
    },
    []
  );

  const startOverlayInteraction = useCallback(
    (kind: 'move' | 'resize', clientX: number, clientY: number) => {
      if (!overlayViewportStyle || !activeOverlay) {
        return;
      }
      const overlayKind = activeOverlay;

      const startRect: FloatingOverlayRect = {
        top:
          typeof overlayViewportStyle.top === 'number'
            ? overlayViewportStyle.top
            : 0,
        left:
          typeof overlayViewportStyle.left === 'number'
            ? overlayViewportStyle.left
            : 0,
        width:
          typeof overlayViewportStyle.width === 'number'
            ? overlayViewportStyle.width
            : overlayLayoutsRef.current[overlayKind].rect.width,
        maxHeight:
          typeof overlayViewportStyle.maxHeight === 'number'
            ? overlayViewportStyle.maxHeight
            : overlayLayoutsRef.current[overlayKind].rect.maxHeight,
      };
      const minWidth =
        overlayKind === 'footer'
          ? FOOTER_OVERLAY_MIN_WIDTH_PX
          : ELEMENT_OVERLAY_MIN_WIDTH_PX;
      const maxWidth =
        overlayKind === 'footer'
          ? FOOTER_OVERLAY_MAX_WIDTH_PX
          : ELEMENT_OVERLAY_MAX_WIDTH_PX;
      const minHeight =
        overlayKind === 'footer'
          ? FOOTER_OVERLAY_MIN_HEIGHT_PX
          : ELEMENT_OVERLAY_MIN_HEIGHT_PX;
      const startMode = overlayLayoutsRef.current[overlayKind].mode;
      const deltaX = clientX - startRect.left;
      const deltaY = clientY - startRect.top;

      function scheduleDomUpdate(nextRect: FloatingOverlayRect) {
        liveOverlayRectRef.current = nextRect;

        if (overlayInteractionFrameRef.current !== null) {
          return;
        }

        overlayInteractionFrameRef.current = window.requestAnimationFrame(
          () => {
            overlayInteractionFrameRef.current = null;
            if (liveOverlayRectRef.current) {
              applyOverlayRectToDom(liveOverlayRectRef.current);
            }
          }
        );
      }

      function handlePointerMove(event: PointerEvent) {
        let nextRect = startRect;

        if (kind === 'move') {
          nextRect = {
            ...startRect,
            left: Math.max(
              OVERLAY_VIEWPORT_MARGIN_PX,
              Math.min(
                event.clientX - deltaX,
                window.innerWidth - startRect.width - OVERLAY_VIEWPORT_MARGIN_PX
              )
            ),
            top: Math.max(
              OVERLAY_VIEWPORT_MARGIN_PX,
              Math.min(
                event.clientY - deltaY,
                window.innerHeight -
                  startRect.maxHeight -
                  OVERLAY_VIEWPORT_MARGIN_PX
              )
            ),
          };
        } else {
          nextRect = {
            ...startRect,
            width: Math.max(
              minWidth,
              Math.min(
                startRect.width + (event.clientX - clientX),
                Math.min(
                  maxWidth,
                  window.innerWidth -
                    startRect.left -
                    OVERLAY_VIEWPORT_MARGIN_PX
                )
              )
            ),
            maxHeight: Math.max(
              minHeight,
              Math.min(
                startRect.maxHeight + (event.clientY - clientY),
                window.innerHeight - startRect.top - OVERLAY_VIEWPORT_MARGIN_PX
              )
            ),
          };
        }

        scheduleDomUpdate(nextRect);
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (overlayInteractionFrameRef.current !== null) {
          window.cancelAnimationFrame(overlayInteractionFrameRef.current);
          overlayInteractionFrameRef.current = null;
        }

        const finalRect = liveOverlayRectRef.current ?? startRect;
        liveOverlayRectRef.current = null;
        commitOverlayLayout(
          overlayKind,
          finalRect,
          kind === 'move' ? 'manual' : startMode
        );
        setOverlayViewportStyle((current) =>
          current
            ? {
                ...current,
                top: finalRect.top,
                left: finalRect.left,
                width: finalRect.width,
                maxHeight: finalRect.maxHeight,
              }
            : current
        );
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      document.body.style.userSelect = 'none';
      document.body.style.cursor = kind === 'move' ? 'grabbing' : 'nwse-resize';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [
      activeOverlay,
      applyOverlayRectToDom,
      commitOverlayLayout,
      overlayViewportStyle,
    ]
  );

  const startFooterZoneDrag = useCallback(
    (clientY: number) => {
      const activeFooterConfig = footerConfig;

      if (!activeFooterConfig || !gridOverlayStyle || !footerZoneRef.current) {
        return;
      }

      const overlayHeight =
        typeof gridOverlayStyle.height === 'number'
          ? gridOverlayStyle.height
          : null;
      if (!overlayHeight || overlayHeight <= 0) {
        return;
      }

      const footerToDrag: PdfTemplateFooterConfig = activeFooterConfig;
      const normalizedOverlayHeight = overlayHeight;
      const startTopSpacing = footerToDrag.topSpacing;

      function scheduleZoneOffset(nextOffset: number) {
        liveFooterZoneOffsetRef.current = nextOffset;

        if (footerZoneDragFrameRef.current !== null) {
          return;
        }

        footerZoneDragFrameRef.current = window.requestAnimationFrame(() => {
          footerZoneDragFrameRef.current = null;
          if (footerZoneRef.current) {
            footerZoneRef.current.style.transform = `translateY(${liveFooterZoneOffsetRef.current}px)`;
          }
        });
      }

      function handlePointerMove(event: PointerEvent) {
        scheduleZoneOffset(event.clientY - clientY);
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (footerZoneDragFrameRef.current !== null) {
          window.cancelAnimationFrame(footerZoneDragFrameRef.current);
          footerZoneDragFrameRef.current = null;
        }

        const deltaPixels = liveFooterZoneOffsetRef.current;
        liveFooterZoneOffsetRef.current = 0;

        if (footerZoneRef.current) {
          footerZoneRef.current.style.transform = '';
        }

        const deltaMm =
          (deltaPixels / normalizedOverlayHeight) * PDF_PAGE_HEIGHT_MM;
        const nextTopSpacing = Math.max(
          0,
          Math.min(24, startTopSpacing - deltaMm)
        );

        if (nextTopSpacing !== footerToDrag.topSpacing) {
          setFooterConfig({
            ...footerToDrag,
            topSpacing: Number(nextTopSpacing.toFixed(2)),
          });
        }

        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [footerConfig, gridOverlayStyle]
  );

  useEffect(() => {
    if (!activeOverlay) {
      return;
    }

    overlayPanelRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        overlayPanelRef.current?.contains(target) ||
        target.closest('[data-overlay-trigger="true"]') ||
        target.closest('[data-slot="select-content"]') ||
        target.closest('[data-slot="select-item"]') ||
        target.closest('[data-slot="select-trigger"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }

      closeActiveOverlay();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeActiveOverlay();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOverlay, closeActiveOverlay]);

  useEffect(() => {
    return () => {
      if (overlayInteractionFrameRef.current !== null) {
        window.cancelAnimationFrame(overlayInteractionFrameRef.current);
      }
      if (footerZoneDragFrameRef.current !== null) {
        window.cancelAnimationFrame(footerZoneDragFrameRef.current);
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <div className="space-y-4 pt-4 pb-3">
      <div ref={topBarRef}>
        <PdfTemplateEditorTopBar
          name={name}
          onNameChange={setName}
          saveStateLabel={saveStateLabel}
          isSaving={isSaving}
          onSave={() => void saveTemplate()}
        />
      </div>

      <div ref={layoutViewportRef} className="min-w-0 pb-1.5">
        <div
          className="min-h-0 overflow-hidden"
          style={workspaceContainerStyle}
        >
          <div
            ref={workspaceGridRef}
            className="grid h-full min-h-0 w-full min-w-0 items-stretch gap-0"
            style={{
              gridTemplateColumns: `${currentLeftWidth}px ${leftHandleWidth}px minmax(0,1fr) ${rightHandleWidth}px ${currentRightWidth}px`,
            }}
          >
            <div className="h-full min-h-0 overflow-hidden pr-1.5">
              {isFieldSidebarOpen ? (
                <div className="relative h-full min-h-0 overflow-hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute top-3 right-3 z-10 h-8 w-8 rounded-xl border-slate-200 bg-white"
                    onClick={() => setIsFieldSidebarOpen(false)}
                    aria-label="Feldliste einklappen"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                  <PdfTemplateFieldSidebar
                    fields={libraryFields}
                    onInsertField={handleInsertField}
                    onDragFieldStart={(field) => setDraggedFieldKey(field.key)}
                    onDragFieldEnd={() => {
                      setDraggedFieldKey(null);
                      setIsCanvasDropActive(false);
                    }}
                    insertionMode={
                      activeOverlay === 'footer' ? 'footer' : 'canvas'
                    }
                    footerTargetLabel={
                      activeOverlay === 'footer' && activeFooterTarget.rowId
                        ? `Zeile ${Math.max(
                            1,
                            (footerConfig?.rows.findIndex(
                              (row) => row.id === activeFooterTarget.rowId
                            ) ?? 0) + 1
                          )}${
                            footerConfig?.layout === 'two_column'
                              ? activeFooterTarget.column === 'left'
                                ? ', links'
                                : ', rechts'
                              : ''
                          }`
                        : null
                    }
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col items-center rounded-[1.25rem] border border-slate-200 bg-white p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => setIsFieldSidebarOpen(true)}
                    aria-label="Feldliste ausklappen"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    className="mt-3 flex flex-1 items-center justify-center"
                    onClick={() => setIsFieldSidebarOpen(true)}
                    aria-label="Verfügbare Felder anzeigen"
                  >
                    <span className="rotate-180 text-[11px] font-semibold tracking-[0.24em] text-slate-600 uppercase [writing-mode:vertical-rl]">
                      Felder
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex h-full min-h-0 items-center justify-center">
              {isFieldSidebarOpen ? (
                <button
                  type="button"
                  className="group flex h-full w-full cursor-col-resize items-center justify-center"
                  aria-label="Breite der Feldnavigation anpassen"
                  onPointerDown={(event) => startResize('left', event.clientX)}
                >
                  <span className="h-24 w-1.5 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400" />
                </button>
              ) : null}
            </div>

            <div className="h-full min-h-0 min-w-0 px-1.5">
              <PdfTemplateCanvasWorkspace
                editorCanvasRef={editorCanvasRef}
                footerZoneStyle={footerZoneStyle}
                showGrid={showGrid}
                gridSize={gridSize}
                snapToGrid={snapToGrid}
                zoomLevel={zoomLevel}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                gridOverlayStyle={gridOverlayStyle}
                isCanvasDropActive={isCanvasDropActive}
                gridPatternSize={gridPatternSize}
                editorSurfaceMaxWidth={editorSurfaceMaxWidth}
                onToggleGrid={() => setShowGrid((current) => !current)}
                onToggleSnap={() => setSnapToGrid((current) => !current)}
                onZoomIn={() =>
                  setZoomLevel((current) => Math.min(current + 10, 150))
                }
                onZoomOut={() =>
                  setZoomLevel((current) => Math.max(current - 10, 60))
                }
                onUndo={undoTemplateChange}
                onRedo={redoTemplateChange}
                onDragOver={handleCanvasDragOver}
                onDragLeave={handleCanvasDragLeave}
                onDrop={handleCanvasDrop}
                onPointerDownCapture={handleCanvasPointerDownCapture}
                onDoubleClickCapture={handleCanvasDoubleClickCapture}
                onContextMenuCapture={handleCanvasContextMenuCapture}
              >
                <div
                  className="relative z-10"
                  style={{ zoom: `${zoomLevel}%` }}
                >
                  <div
                    ref={containerRef}
                    className="relative min-h-[42rem] w-full"
                  />
                </div>

                {canvasSchemaHotspots.map((hotspot) => (
                  <div
                    key={hotspot.key}
                    className={cn(
                      'pointer-events-none absolute z-30 rounded-md border transition-colors',
                      selectedElementKey === hotspot.key
                        ? 'border-sky-500 bg-sky-300/12 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]'
                        : 'border-transparent'
                    )}
                    style={{
                      top: hotspot.y,
                      left: hotspot.x,
                      width: hotspot.width,
                      height: hotspot.height,
                    }}
                  />
                ))}

                {footerInteractiveZoneStyle ? (
                  <div
                    ref={footerZoneRef}
                    data-footer-zone="true"
                    className={cn(
                      'absolute z-30 rounded-md border transition-colors',
                      isFooterSelected || activeOverlay === 'footer'
                        ? 'border-sky-500 bg-sky-300/12 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]'
                        : 'border-transparent'
                    )}
                    style={footerInteractiveZoneStyle}
                  >
                    <div
                      className="h-full w-full cursor-default"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        startFooterZoneDrag(event.clientY);
                      }}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                          footerConfig?.enabled &&
                          footerConfig.pageIndex !== currentPageIndex
                        ) {
                          setFooterConfig({
                            ...footerConfig,
                            pageIndex: currentPageIndex,
                          });
                        }

                        openFooterOverlay(event.currentTarget);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                          footerConfig?.enabled &&
                          footerConfig.pageIndex !== currentPageIndex
                        ) {
                          setFooterConfig({
                            ...footerConfig,
                            pageIndex: currentPageIndex,
                          });
                        }

                        openFooterOverlay(event.currentTarget);
                      }}
                    />
                  </div>
                ) : null}
              </PdfTemplateCanvasWorkspace>
            </div>

            <div className="flex h-full min-h-0 items-center justify-center">
              {isPreviewOpen ? (
                <button
                  type="button"
                  className="group flex h-full w-full cursor-col-resize items-center justify-center"
                  aria-label="Breite der rechten Seitenleiste anpassen"
                  onPointerDown={(event) => startResize('right', event.clientX)}
                >
                  <span className="h-24 w-1.5 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400" />
                </button>
              ) : null}
            </div>
            {isPreviewOpen ? (
              <PdfTemplateInspectorSidebar
                previewAssignments={previewAssignments}
                selectedPreviewEinsatzId={selectedPreviewEinsatzId}
                onSelectPreviewEinsatzId={setSelectedPreviewEinsatzId}
                onRefreshPreview={handleRefreshPreview}
                isRefreshingPreview={previewInputQuery.isFetching}
                onCollapse={closePreviewSidebar}
                template={renderedTemplate}
                input={previewInput}
              />
            ) : (
              <div className="h-full min-h-0 overflow-hidden pl-1.5">
                <div className="flex h-full flex-col items-center rounded-[1.25rem] border border-slate-200 bg-white p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => setIsPreviewOpen(true)}
                    aria-label="Seitenleiste ausklappen"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    className="mt-3 flex flex-1 items-center justify-center"
                    onClick={() => setIsPreviewOpen(true)}
                    aria-label="Vorschau und Einstellungen anzeigen"
                  >
                    <span className="text-[11px] font-semibold tracking-[0.24em] text-slate-600 uppercase [writing-mode:vertical-rl]">
                      Vorschau
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && activeOverlay && overlayViewportStyle
        ? createPortal(
            <div
              ref={overlayPanelRef}
              tabIndex={-1}
              className="outline-none"
              style={overlayViewportStyle}
            >
              {activeOverlay === 'element' && selectedElement ? (
                <PdfTemplateElementInspectorOverlay
                  selectedElement={selectedElement}
                  fields={fields}
                  onClose={closeActiveOverlay}
                  onMoveStart={(event) => {
                    event.preventDefault();
                    startOverlayInteraction(
                      'move',
                      event.clientX,
                      event.clientY
                    );
                  }}
                  onResizeStart={(event) => {
                    event.preventDefault();
                    startOverlayInteraction(
                      'resize',
                      event.clientX,
                      event.clientY
                    );
                  }}
                  onUpdateBoundField={(fieldKey) =>
                    updateSelectedSchema((schema) => ({
                      ...schema,
                      name: fieldKey,
                      content: `{${fieldKey}}`,
                    }))
                  }
                  onUpdateFontSize={(value) =>
                    updateSelectedSchema((schema) => ({
                      ...schema,
                      fontSize: Math.min(48, Math.max(6, value)),
                    }))
                  }
                  onToggleBold={(value) =>
                    updateSelectedSchema((schema) => ({
                      ...schema,
                      fontName: value ? 'Helvetica-Bold' : 'Helvetica',
                    }))
                  }
                  onUpdateAlignment={(value) =>
                    updateSelectedSchema((schema) => ({
                      ...schema,
                      position: {
                        ...schema.position,
                        x:
                          value === 'center'
                            ? (PDF_PAGE_WIDTH_MM - schema.width) / 2
                            : value === 'right'
                              ? PDF_PAGE_WIDTH_MM -
                                RIGHT_CANVAS_MARGIN_MM -
                                schema.width
                              : LEFT_CANVAS_MARGIN_MM,
                      },
                    }))
                  }
                  onUpdateFontColor={(value) =>
                    updateSelectedSchema((schema) => ({
                      ...schema,
                      fontColor: value,
                    }))
                  }
                  onUpdateLetterSpacing={(value) =>
                    updateSelectedSchema((schema) => ({
                      ...schema,
                      lineHeight: Math.min(20, Math.max(0, value)),
                    }))
                  }
                />
              ) : null}

              {activeOverlay === 'footer' && footerConfig?.enabled ? (
                <PdfTemplateFooterInlineEditor
                  footer={footerConfig}
                  fields={fields}
                  currentPageIndex={currentPageIndex}
                  activeTarget={activeFooterTarget}
                  canAddRow={footerConfig.layout !== 'contact_line'}
                  onSelectTarget={setActiveFooterTarget}
                  onClose={closeActiveOverlay}
                  onDisableFooter={() => {
                    setFooterConfig(null);
                    closeActiveOverlay();
                  }}
                  onUpdateFooter={(nextFooter) => setFooterConfig(nextFooter)}
                  onMoveStart={(event) => {
                    event.preventDefault();
                    startOverlayInteraction(
                      'move',
                      event.clientX,
                      event.clientY
                    );
                  }}
                  onResizeStart={(event) => {
                    event.preventDefault();
                    startOverlayInteraction(
                      'resize',
                      event.clientX,
                      event.clientY
                    );
                  }}
                />
              ) : null}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
