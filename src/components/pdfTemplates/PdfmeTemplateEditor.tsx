'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Template } from '@pdfme/common';
import {
  Eye,
  Grid3X3,
  LoaderCircle,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createPdfTemplate,
  getPdfPreviewInput,
  updatePdfTemplate,
} from '@/app/actions/pdfTemplates';
import { PdfTemplateFieldSidebar } from './PdfTemplateFieldSidebar';
import { PdfTemplatePreviewPanel } from './PdfTemplatePreviewPanel';
import { getPdfmePlugins } from '@/features/pdf-templates/pdf-template-default';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateInput,
} from '@/features/pdf-templates/types';
import { insertFieldIntoTemplate } from '@/features/pdf-templates/insert-field-into-template';

interface PdfmeTemplateEditorProps {
  organizationId: string;
  templateId?: string;
  initialName: string;
  initialTemplate: Template;
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

const COLLAPSED_PANEL_WIDTH = 56;
const RESIZE_HANDLE_WIDTH = 8;
const MIN_LEFT_PANEL_WIDTH = 220;
const MIN_RIGHT_PANEL_WIDTH = 220;
const MIN_EDITOR_WIDTH = 500;
const DEFAULT_GRID_SIZE = 5;
const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 40;

export function PdfmeTemplateEditor({
  organizationId,
  templateId,
  initialName,
  initialTemplate,
  initialSampleEinsatzId,
  previewAssignments,
  fields,
}: PdfmeTemplateEditorProps) {
  const router = useRouter();
  const layoutViewportRef = useRef<HTMLDivElement | null>(null);
  const editorCanvasRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const designerRef = useRef<DesignerInstance | null>(null);
  const [name, setName] = useState(initialName);
  const [previewTemplate, setPreviewTemplate] =
    useState<Template>(initialTemplate);
  const [previewInput, setPreviewInput] = useState<PdfTemplateInput>({});
  const [selectedPreviewEinsatzId, setSelectedPreviewEinsatzId] =
    useState<string>(initialSampleEinsatzId ?? 'mock');
  const [isFieldSidebarOpen, setIsFieldSidebarOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID_SIZE);
  const [gridOverlayStyle, setGridOverlayStyle] =
    useState<CSSProperties | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(296);
  const [rightPanelWidth, setRightPanelWidth] = useState(296);
  const [isSaving, startSaving] = useTransition();

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

      const instance = new Designer({
        domContainer: containerRef.current,
        template: initialTemplate,
        options: {
          lang: 'de',
          zoomLevel: 0.9,
          sidebarOpen: true,
        },
        plugins: getPdfmePlugins(),
      });

      instance.onChangeTemplate((changedTemplate) => {
        setPreviewTemplate(changedTemplate);
      });

      designerRef.current = {
        destroy: () => instance.destroy(),
        getTemplate: () => instance.getTemplate(),
        updateTemplate: (template) => instance.updateTemplate(template),
        getPageCursor: () => instance.getPageCursor(),
      };
    }

    void initializeDesigner();

    return () => {
      cancelled = true;
      designerRef.current?.destroy();
      designerRef.current = null;
    };
  }, [initialTemplate]);

  useEffect(() => {
    async function loadPreviewInput() {
      const input = await getPdfPreviewInput(
        selectedPreviewEinsatzId === 'mock' ? null : selectedPreviewEinsatzId
      );
      setPreviewInput(input);
    }

    void loadPreviewInput();
  }, [selectedPreviewEinsatzId]);

  useEffect(() => {
    function syncGridOverlay() {
      const editorCanvasElement = editorCanvasRef.current;
      const designerContainer = containerRef.current;

      if (!editorCanvasElement || !designerContainer) {
        setGridOverlayStyle(null);
        return;
      }

      const pageElement = designerContainer.querySelector<HTMLDivElement>(
        'div[style*="background-size"][style*="position: relative"]'
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

    const resizeObserver = new ResizeObserver(() => {
      syncGridOverlay();
    });

    if (editorCanvasRef.current) {
      resizeObserver.observe(editorCanvasRef.current);
    }

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const mutationObserver = new MutationObserver(() => {
      syncGridOverlay();
    });

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
  }, [previewTemplate]);

  async function refreshPreview() {
    const template = designerRef.current?.getTemplate();

    if (!template) {
      return;
    }

    setPreviewTemplate(template);
  }

  function handleInsertField(field: PdfTemplateFieldDefinition) {
    const template = designerRef.current?.getTemplate();
    const pageCursor = designerRef.current?.getPageCursor() ?? 0;

    if (!template) {
      toast.error('Designer ist nicht initialisiert');
      return;
    }

    const insertedTemplate = insertFieldIntoTemplate({
      template,
      field,
      pageIndex: pageCursor,
    });
    designerRef.current?.updateTemplate(insertedTemplate);
    setPreviewTemplate(insertedTemplate);
    toast.success(`"${field.label}" wurde eingefügt`);
  }

  function clampGridSize(value: number): number {
    return Math.min(MAX_GRID_SIZE, Math.max(MIN_GRID_SIZE, value));
  }

  function setGridSizeValue(value: number) {
    setGridSize(clampGridSize(value));
  }

  function adjustGridSize(delta: number) {
    setGridSizeValue(gridSize + delta);
  }

  function handleGridSizeInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value);

    if (Number.isNaN(nextValue)) {
      return;
    }

    setGridSizeValue(nextValue);
  }

  async function saveTemplate() {
    startSaving(async () => {
      try {
        const template = designerRef.current?.getTemplate();

        if (!template) {
          toast.error('Designer ist nicht initialisiert');
          return;
        }

        const payload = {
          name,
          template,
          sampleEinsatzId:
            selectedPreviewEinsatzId === 'mock'
              ? null
              : selectedPreviewEinsatzId,
        };

        if (templateId) {
          await updatePdfTemplate(templateId, payload);
          toast.success('Vorlage gespeichert');
          setPreviewTemplate(template);
          router.refresh();
          return;
        }

        const created = await createPdfTemplate({
          organizationId,
          ...payload,
        });

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

  function startResize(side: 'left' | 'right', clientX: number) {
    const initialX = clientX;
    const initialLeftWidth = leftPanelWidth;
    const initialRightWidth = rightPanelWidth;
    const availableWidth =
      layoutViewportRef.current?.clientWidth ?? window.innerWidth;
    const leftHandleWidth = isFieldSidebarOpen ? RESIZE_HANDLE_WIDTH : 0;
    const rightHandleWidth = isPreviewOpen ? RESIZE_HANDLE_WIDTH : 0;
    const maxLeftWidth = Math.max(
      MIN_LEFT_PANEL_WIDTH,
      availableWidth -
        initialRightWidth -
        leftHandleWidth -
        rightHandleWidth -
        MIN_EDITOR_WIDTH
    );
    const maxRightWidth = Math.max(
      MIN_RIGHT_PANEL_WIDTH,
      availableWidth -
        initialLeftWidth -
        leftHandleWidth -
        rightHandleWidth -
        MIN_EDITOR_WIDTH
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
  const layoutMinWidth =
    currentLeftWidth +
    currentRightWidth +
    leftHandleWidth +
    rightHandleWidth +
    MIN_EDITOR_WIDTH;
  const gridPatternSize = `${Math.max(gridSize * 6, 18)}px`;
  const collapsedPanelsCount =
    Number(!isFieldSidebarOpen) + Number(!isPreviewOpen);
  const editorSurfaceMaxWidth =
    collapsedPanelsCount === 2
      ? '72rem'
      : collapsedPanelsCount === 1
        ? '64rem'
        : '56rem';

  return (
    <div className="space-y-5 pt-2">
      <div className="sticky top-16 z-30 -mx-4 border-b bg-white/95 px-4 py-4 shadow-sm backdrop-blur xl:mx-0 xl:rounded-xl xl:border">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-2 xl:min-w-96">
            <Label htmlFor="pdf-template-name">Vorlagenname</Label>
            <Input
              id="pdf-template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Buchungsbestätigung"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid gap-2 sm:min-w-72">
              <Label htmlFor="preview-einsatz">Vorschaudaten</Label>
              <Select
                value={selectedPreviewEinsatzId}
                onValueChange={setSelectedPreviewEinsatzId}
              >
                <SelectTrigger id="preview-einsatz">
                  <SelectValue placeholder="Vorschaudaten auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Testdaten</SelectItem>
                  {previewAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void refreshPreview()}
              >
                <Eye className="mr-2 h-4 w-4" />
                Vorschau aktualisieren
              </Button>
              <Button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div ref={layoutViewportRef} className="overflow-x-auto pb-2">
        <div
          className="grid items-start gap-0 pt-2"
          style={{
            minWidth: `${layoutMinWidth}px`,
            gridTemplateColumns: `${currentLeftWidth}px ${leftHandleWidth}px minmax(${MIN_EDITOR_WIDTH}px,1fr) ${rightHandleWidth}px ${currentRightWidth}px`,
          }}
        >
          <div className="h-[calc(100vh-13rem)] min-h-0 self-start pr-1">
            {isFieldSidebarOpen ? (
              <div className="relative h-full">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute top-3 right-3 z-10 h-8 w-8"
                  onClick={() => setIsFieldSidebarOpen(false)}
                  aria-label="Feldliste einklappen"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
                <PdfTemplateFieldSidebar
                  fields={fields}
                  onInsertField={handleInsertField}
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
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
                  <span className="rotate-180 text-[11px] font-medium tracking-[0.2em] text-slate-600 uppercase [writing-mode:vertical-rl]">
                    Felder
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex h-[calc(100vh-13rem)] items-center justify-center">
            {isFieldSidebarOpen ? (
              <button
                type="button"
                className="group flex h-full w-full cursor-col-resize items-center justify-center"
                aria-label="Breite der Feldnavigation anpassen"
                onPointerDown={(event) => startResize('left', event.clientX)}
              >
                <span className="h-16 w-1 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400" />
              </button>
            ) : null}
          </div>

          <div className="min-w-0 self-start px-[1px]">
            <div className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.72))] px-1 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div
                className="mx-auto min-w-[31.25rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                style={{ maxWidth: editorSurfaceMaxWidth }}
              >
                <div ref={editorCanvasRef} className="relative">
                  <div className="absolute top-3 left-3 z-30">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant={showGrid ? 'outline' : 'outline'}
                          size="sm"
                          className="min-w-[8.5rem] justify-between gap-2"
                        >
                          <span className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Raster
                          </span>
                          <span className="w-10 text-right text-xs text-slate-500">
                            {showGrid ? `${gridSize} mm` : 'Aus'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-80 rounded-xl p-0"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Raster
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Steuert die sichtbare Rasterhilfe direkt im
                                Editor.
                              </p>
                            </div>
                            <Grid3X3 className="mt-0.5 h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-4 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <Label
                                htmlFor="show-grid"
                                className="text-sm font-medium text-slate-900"
                              >
                                Grid anzeigen
                              </Label>
                              <p className="text-xs text-slate-500">
                                Blendet das Raster über der PDF-Fläche ein.
                              </p>
                            </div>
                            <Button
                              id="show-grid"
                              type="button"
                              variant={showGrid ? 'secondary' : 'outline'}
                              size="sm"
                              className="w-14"
                              onClick={() => setShowGrid((current) => !current)}
                            >
                              {showGrid ? 'An' : 'Aus'}
                            </Button>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <Label
                              htmlFor="grid-size-input"
                              className="text-sm font-medium text-slate-900"
                            >
                              Rastergröße
                            </Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => adjustGridSize(-1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <div className="relative flex-1">
                                <Input
                                  id="grid-size-input"
                                  type="number"
                                  min={MIN_GRID_SIZE}
                                  max={MAX_GRID_SIZE}
                                  step={1}
                                  value={gridSize}
                                  onChange={handleGridSizeInputChange}
                                  className="pr-12"
                                />
                                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-slate-500">
                                  mm
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => adjustGridSize(1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                              Erhöhe oder verringere das Raster in
                              1-mm-Schritten.
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {showGrid && gridOverlayStyle ? (
                    <div
                      className="pointer-events-none absolute z-20 opacity-35"
                      style={{
                        ...gridOverlayStyle,
                        backgroundImage:
                          'linear-gradient(to right, rgba(100,116,139,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.16) 1px, transparent 1px)',
                        backgroundSize: `${gridPatternSize} ${gridPatternSize}`,
                      }}
                    />
                  ) : null}
                  <div
                    ref={containerRef}
                    className="relative z-10 h-[calc(100vh-13rem)] min-h-176 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-13rem)] items-center justify-center">
            {isPreviewOpen ? (
              <button
                type="button"
                className="group flex h-full w-full cursor-col-resize items-center justify-center"
                aria-label="Breite der Vorschau anpassen"
                onPointerDown={(event) => startResize('right', event.clientX)}
              >
                <span className="h-16 w-1 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400" />
              </button>
            ) : null}
          </div>

          <div className="h-[calc(100vh-13rem)] min-h-0 self-start pl-1">
            {isPreviewOpen ? (
              <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute top-3 right-3 z-10 h-8 w-8"
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label="Vorschau einklappen"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
                <div className="border-b border-slate-200 bg-slate-50/80 p-4 pr-14">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Vorschau
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Testdaten oder echter Einsatz rechts neben dem Designer.
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/50 p-3">
                  <PdfTemplatePreviewPanel
                    template={previewTemplate}
                    input={previewInput}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setIsPreviewOpen(true)}
                  aria-label="Vorschau ausklappen"
                >
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  className="mt-3 flex flex-1 items-center justify-center"
                  onClick={() => setIsPreviewOpen(true)}
                  aria-label="Vorschau anzeigen"
                >
                  <span className="text-[11px] font-medium tracking-[0.2em] text-slate-600 uppercase [writing-mode:vertical-rl]">
                    Vorschau
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
