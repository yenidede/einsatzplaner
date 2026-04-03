'use client';

import type {
  CSSProperties,
  DragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { Grid3X3, Redo2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PdfTemplateCanvas } from './PdfTemplateCanvas';
import type {
  ActiveOverlay,
  CanvasSchemaHotspot,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';

interface PdfTemplateEditorCanvasStageProps {
  editorCanvasRef: RefObject<HTMLDivElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  footerZoneRef: RefObject<HTMLDivElement | null>;
  footerZoneStyle?: CSSProperties | null;
  footerInteractiveZoneStyle?: CSSProperties | null;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  zoomLevel: number;
  canUndo: boolean;
  canRedo: boolean;
  gridOverlayStyle: CSSProperties | null;
  isCanvasDropActive: boolean;
  gridPatternSize: string;
  editorSurfaceMaxWidth: string;
  canvasSchemaHotspots: CanvasSchemaHotspot[];
  selectedElementKey: string | null;
  isFooterSelected: boolean;
  activeOverlay: ActiveOverlay;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPointerDownCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUpCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onContextMenuCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onFooterZonePointerDown: (clientY: number) => void;
  onFooterZoneActivate: (target: HTMLDivElement) => void;
}

export function PdfTemplateEditorCanvasStage({
  editorCanvasRef,
  containerRef,
  footerZoneRef,
  footerZoneStyle,
  footerInteractiveZoneStyle,
  showGrid,
  gridSize,
  snapToGrid,
  zoomLevel,
  canUndo,
  canRedo,
  gridOverlayStyle,
  isCanvasDropActive,
  gridPatternSize,
  editorSurfaceMaxWidth,
  canvasSchemaHotspots,
  selectedElementKey,
  isFooterSelected,
  activeOverlay,
  onToggleGrid,
  onToggleSnap,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onDragOver,
  onDragLeave,
  onDrop,
  onPointerDownCapture,
  onPointerUpCapture,
  onDoubleClickCapture,
  onContextMenuCapture,
  onFooterZonePointerDown,
  onFooterZoneActivate,
}: PdfTemplateEditorCanvasStageProps) {
  return (
    <div className="h-full min-h-0 min-w-0 px-1.5">
      <div className="relative h-full min-h-0">
        <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white/95 p-1 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Rückgängig"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Wiederholen"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />
            <Button
              type="button"
              variant={showGrid ? 'secondary' : 'ghost'}
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={onToggleGrid}
            >
              <Grid3X3 className="h-4 w-4" />
              Raster {showGrid ? `${gridSize} mm` : 'aus'}
            </Button>
            <Button
              type="button"
              variant={snapToGrid ? 'secondary' : 'ghost'}
              className="h-8 rounded-full px-2.5 text-xs"
              onClick={onToggleSnap}
            >
              Snap {snapToGrid ? 'an' : 'aus'}
            </Button>
            <div className="mx-0.5 hidden h-5 w-px bg-slate-200 sm:block" />
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-2.5 text-sm"
              onClick={onZoomOut}
            >
              -
            </Button>
            <div className="min-w-14 text-center text-xs font-semibold text-slate-700">
              {zoomLevel}%
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-2.5 text-sm"
              onClick={onZoomIn}
            >
              +
            </Button>
          </div>
        </div>

        <PdfTemplateCanvas
          editorCanvasRef={editorCanvasRef}
          footerZoneStyle={footerZoneStyle}
          showGrid={showGrid}
          gridOverlayStyle={gridOverlayStyle}
          isCanvasDropActive={isCanvasDropActive}
          gridPatternSize={gridPatternSize}
          editorSurfaceMaxWidth={editorSurfaceMaxWidth}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPointerDownCapture={onPointerDownCapture}
          onPointerUpCapture={onPointerUpCapture}
          onDoubleClickCapture={onDoubleClickCapture}
          onContextMenuCapture={onContextMenuCapture}
        >
          <div className="relative z-10" style={{ zoom: `${zoomLevel}%` }}>
            <div ref={containerRef} className="relative min-h-[42rem] w-full" />
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
                  onFooterZonePointerDown(event.clientY);
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFooterZoneActivate(event.currentTarget);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFooterZoneActivate(event.currentTarget);
                }}
              />
            </div>
          ) : null}
        </PdfTemplateCanvas>
      </div>
    </div>
  );
}
