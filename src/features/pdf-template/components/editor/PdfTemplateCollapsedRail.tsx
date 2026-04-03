'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfTemplateCollapsedRailProps {
  icon: LucideIcon;
  label: string;
  buttonAriaLabel: string;
  panelAriaLabel: string;
  onOpen: () => void;
  reverseText?: boolean;
}

export function PdfTemplateCollapsedRail({
  icon: Icon,
  label,
  buttonAriaLabel,
  panelAriaLabel,
  onOpen,
  reverseText = false,
}: PdfTemplateCollapsedRailProps) {
  return (
    <div className="h-full min-h-0 overflow-hidden pl-1.5">
      <div className="flex h-full flex-col items-center rounded-[1.25rem] border border-slate-200 bg-white p-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={onOpen}
          aria-label={buttonAriaLabel}
        >
          <Icon className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="mt-3 flex flex-1 items-center justify-center"
          onClick={onOpen}
          aria-label={panelAriaLabel}
        >
          <span
            className={[
              'text-[11px] font-semibold tracking-[0.24em] text-slate-600 uppercase [writing-mode:vertical-rl]',
              reverseText ? 'rotate-180' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
          </span>
        </button>
      </div>
    </div>
  );
}
