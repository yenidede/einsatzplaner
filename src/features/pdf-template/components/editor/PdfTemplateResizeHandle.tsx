'use client';

interface PdfTemplateResizeHandleProps {
  ariaLabel: string;
  onResizeStart: (clientX: number) => void;
}

export function PdfTemplateResizeHandle({
  ariaLabel,
  onResizeStart,
}: PdfTemplateResizeHandleProps) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <button
        type="button"
        className="group flex h-full w-full cursor-col-resize items-center justify-center"
        aria-label={ariaLabel}
        onPointerDown={(event) => onResizeStart(event.clientX)}
      >
        <span className="h-24 w-1.5 rounded-full bg-slate-200 transition-colors group-hover:bg-slate-400" />
      </button>
    </div>
  );
}
