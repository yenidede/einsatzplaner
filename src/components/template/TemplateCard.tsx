'use client';

import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const templateCardVariants = cva(
  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-slate-50 text-left transition-colors hover:border-slate-300 hover:bg-slate-100',
  {
    variants: {
      size: {
        default: 'p-6',
        sm: 'p-4 gap-1.5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export interface TemplateCardProps
  extends VariantProps<typeof templateCardVariants> {
  /** Icon, image, or any element to show above the title. */
  icon: ReactNode;
  /** Main label/title. */
  title: string;
  /** Optional description below the title. */
  description?: string | null;
  onClick: () => void;
  className?: string;
}

export function TemplateCard({
  icon,
  title,
  description,
  onClick,
  size = 'default',
  className,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(templateCardVariants({ size }), className)}
    >
      <div className="shrink-0">{icon}</div>
      <span
        className={cn(
          'text-center font-medium text-slate-900',
          size === 'sm' ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </span>
      {description && (
        <span className="text-muted-foreground line-clamp-2 text-center text-xs">
          {description}
        </span>
      )}
    </button>
  );
}
