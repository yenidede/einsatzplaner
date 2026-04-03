'use client';

import type {
  CSSProperties,
  DragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import { cn } from '@/lib/utils';
import { PdfTemplateCanvas } from './PdfTemplateCanvas';
import type { ActiveOverlay, CanvasSchemaHotspot } from '@/features/pdf-template/lib/pdf-template-editor-utils';

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
  onDoubleClickCapture,
  onContextMenuCapture,
  onFooterZonePointerDown,
  onFooterZoneActivate,
}: PdfTemplateEditorCanvasStageProps) {
  return (
    <div className="h-full min-h-0 min-w-0 px-1.5">
      <PdfTemplateCanvas
        editorCanvasRef={editorCanvasRef}
        footerZoneStyle={footerZoneStyle}
        showGrid={showGrid}
        gridSize={gridSize}
        snapToGrid={snapToGrid}
        zoomLevel={zoomLevel}
        canUndo={canUndo}
        canRedo={canRedo}
        gridOverlayStyle={gridOverlayStyle}
        isCanvasDropActive={isCanvasDropActive}
        gridPatternSize={gridPatternSize}
        editorSurfaceMaxWidth={editorSurfaceMaxWidth}
        onToggleGrid={onToggleGrid}
        onToggleSnap={onToggleSnap}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onUndo={onUndo}
        onRedo={onRedo}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPointerDownCapture={onPointerDownCapture}
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
                event.preventDefault();
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
  );
}
