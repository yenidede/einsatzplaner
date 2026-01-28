'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}

export function NavItem({
  label,
  icon: Icon,
  isActive,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      />
      <span className="truncate">{label}</span>
      <ChevronRight
        className={cn(
          'ml-auto h-4 w-4 shrink-0 transition-transform',
          isActive
            ? 'text-primary-foreground'
            : 'opacity-0 group-hover:opacity-50'
        )}
      />
    </button>
  );
}
