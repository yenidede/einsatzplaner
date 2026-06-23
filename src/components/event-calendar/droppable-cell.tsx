'use client';

import { useDroppable } from '@dnd-kit/core';

import { cn } from '@/lib/utils';
import { useCalendarDnd } from '@/components/event-calendar';

interface DroppableCellProps {
  id: string;
  date: Date;
  time?: number; // For week/day views, represents hours (e.g., 9.25 for 9:15)
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function isBlockedClickTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest('[data-saving="true"], [aria-disabled="true"]')
  );
}

export function DroppableCell({
  id,
  date,
  time,
  children,
  className,
  onClick,
}: DroppableCellProps) {
  const { activeEvent } = useCalendarDnd();

  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      time,
    },
  });

  // Format time for display in tooltip (only for debugging)
  const formattedTime =
    time !== undefined
      ? `${Math.floor(time)}:${Math.round((time - Math.floor(time)) * 60)
          .toString()
          .padStart(2, '0')}`
      : null;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isBlockedClickTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.();
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        'data-dragging:bg-accent flex h-full flex-col overflow-hidden px-0.5 py-1 sm:px-1',
        className
      )}
      title={formattedTime ? `${formattedTime}` : undefined}
      data-dragging={isOver && activeEvent ? true : undefined}
    >
      {children}
    </div>
  );
}
