'use client';

import type {
  CSSProperties,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react';
import { Grid3X3, Redo2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfTemplateCanvasWorkspaceProps {
  editorCanvasRef: RefObject<HTMLDivElement | null>;
  footerZoneStyle?: CSSProperties | null;
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
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPointerDownCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUpCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClickCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onContextMenuCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export function PdfTemplateCanvasWorkspace({
  editorCanvasRef,
  footerZoneStyle,
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
  children,
}: PdfTemplateCanvasWorkspaceProps) {
  return (
    <div className="h-full min-w-0 px-1.5">
      <div className="relative h-full overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(241,245,249,0.92)_36%,rgba(226,232,240,0.88))] p-4 shadow-[0_20px_64px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),transparent)]" />

        <div className="absolute top-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 p-1 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur">
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
          <div className="mx-0.5 h-5 w-px bg-slate-200" />
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
          <div className="mx-0.5 h-5 w-px bg-slate-200" />
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

        <div className="pt-[4rem]">
          <div
            className="relative mx-auto overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.14)]"
            style={{ maxWidth: editorSurfaceMaxWidth }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#f1f5f9)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 border-r border-slate-200 bg-[linear-gradient(90deg,#f8fafc,#f1f5f9)]" />
            <div className="pointer-events-none absolute top-0 left-0 z-20 h-7 w-7 border-r border-b border-slate-200 bg-slate-100" />

            <div
              ref={editorCanvasRef}
              className="relative overflow-visible bg-[linear-gradient(180deg,#eef2f7,#f8fafc_22%,#eef2f7)] p-7 pt-9 pl-9"
              onDragOverCapture={onDragOver}
              onDragLeaveCapture={onDragLeave}
              onDropCapture={onDrop}
              onPointerDownCapture={onPointerDownCapture}
              onPointerUpCapture={onPointerUpCapture}
              onDoubleClickCapture={onDoubleClickCapture}
              onContextMenuCapture={onContextMenuCapture}
            >
              <div className="pointer-events-none absolute inset-9 rounded-[1rem] border border-dashed border-slate-300/80" />
              <div className="pointer-events-none absolute inset-[3.8rem] rounded-[0.85rem] border border-sky-200/70" />

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

              {isCanvasDropActive && gridOverlayStyle ? (
                <div
                  className="pointer-events-none absolute z-20 rounded-xl border-2 border-dashed border-sky-400 bg-sky-100/30 shadow-[0_0_0_5px_rgba(56,189,248,0.08)]"
                  style={gridOverlayStyle}
                />
              ) : null}

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
