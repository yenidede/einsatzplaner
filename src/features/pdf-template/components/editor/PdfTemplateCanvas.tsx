'use client';

import type {
  CSSProperties,
  DragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react';

interface PdfTemplateCanvasProps {
  editorCanvasRef: RefObject<HTMLDivElement | null>;
  footerZoneStyle?: CSSProperties | null;
  gridOverlayStyle: CSSProperties | null;
  isCanvasDropActive: boolean;
  gridPatternSize: string;
  editorSurfaceMaxWidth: string;
  showGrid: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPointerDownCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUpCapture?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClickCapture?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onContextMenuCapture?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export function PdfTemplateCanvas({
  editorCanvasRef,
  footerZoneStyle,
  gridOverlayStyle,
  isCanvasDropActive,
  gridPatternSize,
  editorSurfaceMaxWidth,
  showGrid,
  onDragOver,
  onDragLeave,
  onDrop,
  onPointerDownCapture,
  onPointerUpCapture,
  onDoubleClickCapture,
  onContextMenuCapture,
  children,
}: PdfTemplateCanvasProps) {
  return (
    <div className="h-full min-w-0">
      <div className="relative h-full overflow-hidden overscroll-contain rounded-[1.35rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(241,245,249,0.92)_36%,rgba(226,232,240,0.88))] p-3 shadow-[0_20px_64px_rgba(15,23,42,0.07)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),transparent)]" />

        <div className="h-full min-h-0">
          <div
            className="relative mx-auto h-full overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.14)]"
            style={{ maxWidth: editorSurfaceMaxWidth }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#f1f5f9)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 border-r border-slate-200 bg-[linear-gradient(90deg,#f8fafc,#f1f5f9)]" />
            <div className="pointer-events-none absolute top-0 left-0 z-20 h-7 w-7 border-r border-b border-slate-200 bg-slate-100" />

            <div
              ref={editorCanvasRef}
              className="relative h-full overflow-visible bg-[linear-gradient(180deg,#eef2f7,#f8fafc_22%,#eef2f7)] p-7 pt-9 pl-9"
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

export { PdfTemplateCanvas as PdfTemplateCanvasWorkspace };
