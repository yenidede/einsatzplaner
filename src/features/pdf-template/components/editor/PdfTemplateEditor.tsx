'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { type Template } from '@pdfme/common';
import { toast } from 'sonner';
import {
  createPdfTemplate,
  updatePdfTemplate,
} from '@/features/pdf-template/server/pdf-template.actions';
import { PdfTemplateEditorCanvasStage } from './PdfTemplateEditorCanvasStage';
import { PdfTemplateEditorFieldDock } from './PdfTemplateEditorFieldDock';
import { PdfTemplateEditorPreviewDock } from './PdfTemplateEditorPreviewDock';
import { PdfTemplateEditorToolbar } from './PdfTemplateEditorToolbar';
import { PdfTemplateElementRenderer } from './PdfTemplateElementRenderer';
import {
  PdfTemplateFooterBuilder,
  type PdfTemplateFooterTarget,
} from './PdfTemplateFooterBuilder';
import { getPdfmePlugins } from '@/features/pdf-template/lib/pdf-template-defaults';
import {
  applyFooterToTemplate,
  buildFooterLayout,
  buildFooterLibraryField,
  createDefaultFooterConfig,
  stripFooterSchemas,
} from '@/features/pdf-template/lib/pdf-template-footer';
import { applyImageBindingsToTemplate } from '@/features/pdf-template/lib/pdf-template-image';
import {
  ActiveOverlay,
  buildSelectedElementState,
  CanvasSchemaHotspot,
  compareTemplates,
  DEFAULT_GRID_SIZE,
  EMPTY_PREVIEW_INPUT,
  estimateFooterContentWidthMm,
  FOOTER_HIGHLIGHT_PADDING_X_MM,
  FOOTER_HIGHLIGHT_PADDING_Y_MM,
  getDesignerPageElementForIndex,
  getElementLabel,
  getSchemaKey,
  getSelectedElementPageIndex,
  LEFT_CANVAS_MARGIN_MM,
  MAX_GRID_SIZE,
  MIN_GRID_SIZE,
  PDF_PAGE_HEIGHT_MM,
  PDF_PAGE_WIDTH_MM,
  RIGHT_CANVAS_MARGIN_MM,
  sanitizeBaseTemplate,
  TemplateSchema,
  WORKSPACE_BOTTOM_GAP_PX,
  WORKSPACE_MIN_RESERVED_VIEWPORT_PX,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';
import { getEditPdfTemplateSettingsPath } from '@/features/pdf-template/lib/pdf-template-routes';
import { usePdfTemplateCanvasInteractions } from '@/features/pdf-template/hooks/usePdfTemplateCanvasInteractions';
import { usePdfTemplateDockLayout } from '@/features/pdf-template/hooks/usePdfTemplateDockLayout';
import {
  usePdfTemplateEditor,
} from '@/features/pdf-template/hooks/usePdfTemplateEditor';
import { usePdfTemplateOverlay } from '@/features/pdf-template/hooks/usePdfTemplateOverlay';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFooterConfig,
  PdfTemplateInput,
} from '@/features/pdf-template/types';

interface PdfTemplateEditorProps {
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

interface ElementOption {
  key: string;
  label: string;
  meta: string;
}

interface PendingCanvasInteraction {
  kind: 'element';
  elementKey: string;
  triggerElement: HTMLElement | null;
  startX: number;
  startY: number;
}

export function PdfTemplateEditor({
  organizationId,
  templateId,
  initialName,
  initialTemplate,
  initialFooterConfig,
  initialSampleEinsatzId,
  previewAssignments,
  fields,
}: PdfTemplateEditorProps) {
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
  const [isFieldSidebarOpen, setIsFieldSidebarOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [gridOverlayStyle, setGridOverlayStyle] =
    useState<CSSProperties | null>(null);
  const [workspaceViewportOffset, setWorkspaceViewportOffset] = useState(0);
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
  const [activeFooterTarget, setActiveFooterTarget] =
    useState<PdfTemplateFooterTarget>({
      rowId: null,
      column: 'left',
    });
  const [isSaving, startSaving] = useTransition();

  const {
    previewAssignmentId,
    previewInput,
    previewInputQuery,
    selectedPreviewEinsatzId,
    setSelectedPreviewEinsatzId,
  } = usePdfTemplateEditor({
    initialSampleEinsatzId,
    emptyPreviewInput: EMPTY_PREVIEW_INPUT,
  });
  const {
    currentLeftWidth,
    currentRightWidth,
    leftHandleWidth,
    rightHandleWidth,
    startResize,
  } = usePdfTemplateDockLayout({
    layoutViewportRef,
    isFieldSidebarOpen,
    isPreviewOpen,
  });
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
        meta: `Seite ${pageIndex + 1} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ ${schema.type}`,
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
      previewAssignmentId !== baselineSampleRef.current
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

  const saveStateLabel = isDirty ? 'Ungespeicherte ÃƒÆ’Ã¢â‚¬Å¾nderungen' : 'Gespeichert';

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
  async function saveTemplate() {
    startSaving(async () => {
      try {
        const currentTemplate = sanitizeBaseTemplate(
          designerRef.current?.getTemplate() ?? templateRef.current
        );
        const sampleEinsatzId = previewAssignmentId;
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
          getEditPdfTemplateSettingsPath(organizationId, created.id)
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

  const gridPatternSize = `${Math.max(gridSize * 6, 18)}px`;
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
  const {
    closeActiveOverlay,
    lastOverlayTriggerRef,
    overlayPanelRef,
    overlayViewportStyle,
    startFooterZoneDrag,
    startOverlayInteraction,
  } = usePdfTemplateOverlay({
    editorCanvasRef,
    footerZoneRef,
    activeOverlay,
    setActiveOverlay,
    selectedElementKey,
    selectedElementPageIndex,
    canvasSchemaHotspots,
    currentPageIndex,
    footerConfig,
    setFooterConfig,
    footerInteractiveZoneStyle,
  });
  const {
    handleInsertField,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleCanvasPointerDownCapture,
    handleCanvasDoubleClickCapture,
    handleCanvasContextMenuCapture,
    openFooterOverlay,
  } = usePdfTemplateCanvasInteractions({
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
    getCurrentDesignerTemplate: () =>
      sanitizeBaseTemplate(
        designerRef.current?.getTemplate() ?? templateRef.current
      ),
    getCurrentPageCursor: () => designerRef.current?.getPageCursor() ?? 0,
    commitTemplateChange,
  });

  return (
    <div className="space-y-4 pt-4 pb-3">
      <div ref={topBarRef}>
        <PdfTemplateEditorToolbar
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
            <PdfTemplateEditorFieldDock
              isOpen={isFieldSidebarOpen}
              fields={libraryFields}
              activeOverlay={activeOverlay}
              activeFooterTarget={activeFooterTarget}
              footerConfig={footerConfig}
              onOpen={() => setIsFieldSidebarOpen(true)}
              onClose={() => setIsFieldSidebarOpen(false)}
              onResizeStart={(clientX) => startResize('left', clientX)}
              onInsertField={handleInsertField}
              onDragFieldStart={(field) => setDraggedFieldKey(field.key)}
              onDragFieldEnd={() => {
                setDraggedFieldKey(null);
                setIsCanvasDropActive(false);
              }}
            />

            <PdfTemplateEditorCanvasStage
              editorCanvasRef={editorCanvasRef}
              containerRef={containerRef}
              footerZoneRef={footerZoneRef}
              footerZoneStyle={footerZoneStyle}
              footerInteractiveZoneStyle={footerInteractiveZoneStyle}
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
              canvasSchemaHotspots={canvasSchemaHotspots}
              selectedElementKey={selectedElementKey}
              isFooterSelected={isFooterSelected}
              activeOverlay={activeOverlay}
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
              onFooterZonePointerDown={startFooterZoneDrag}
              onFooterZoneActivate={(target) => {
                if (
                  footerConfig?.enabled &&
                  footerConfig.pageIndex !== currentPageIndex
                ) {
                  setFooterConfig({
                    ...footerConfig,
                    pageIndex: currentPageIndex,
                  });
                }

                openFooterOverlay(target);
              }}
            />

            <PdfTemplateEditorPreviewDock
              isOpen={isPreviewOpen}
              previewAssignments={previewAssignments}
              selectedPreviewEinsatzId={selectedPreviewEinsatzId}
              onSelectPreviewEinsatzId={setSelectedPreviewEinsatzId}
              onRefreshPreview={handleRefreshPreview}
              isRefreshingPreview={previewInputQuery.isFetching}
              onOpen={() => setIsPreviewOpen(true)}
              onClose={closePreviewSidebar}
              onResizeStart={(clientX) => startResize('right', clientX)}
              template={renderedTemplate}
              input={previewInput}
            />
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
                <PdfTemplateElementRenderer
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
                <PdfTemplateFooterBuilder
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

export { PdfTemplateEditor as PdfmeTemplateEditor };
