'use client';

import { useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarMode } from './types';

import {
  CalendarEvent,
  EventItem,
  useCalendarDnd,
} from '@/components/event-calendar';
import { isMultiDayEvent } from './utils';

interface DraggableEventProps {
  event: CalendarEvent;
  view: 'month' | 'week' | 'day';
  showTime?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  isSaving?: boolean;
  savingIndicatorTooltip?: string;
  savingToastMessage?: string;
  height?: number;
  isMultiDay?: boolean;
  multiDayWidth?: number;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  'aria-hidden'?: boolean | 'true' | 'false';
  mode: CalendarMode;
  onDelete?: (eventId: string, eventTitle: string) => void;
  onConfirm?: (eventId: string) => void;
  pastIndicatorTooltip: string;
}

export function DraggableEvent({
  event,
  view,
  showTime,
  onClick,
  isSaving,
  savingIndicatorTooltip,
  savingToastMessage,
  height,
  isMultiDay,
  multiDayWidth,
  isFirstDay = true,
  isLastDay = true,
  'aria-hidden': ariaHidden,
  mode,
  onDelete,
  onConfirm,
  pastIndicatorTooltip,
}: DraggableEventProps) {
  const { activeId } = useCalendarDnd();
  const elementRef = useRef<HTMLDivElement>(null);
  const [dragHandlePosition, setDragHandlePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const eventIsMultiDay = isMultiDay ?? isMultiDayEvent(event);
  const isDraggable = !eventIsMultiDay;
  const draggableId = `${event.id}-${view}-${new Date(
    event.start
  ).toISOString()}-${new Date(event.end).toISOString()}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: draggableId,
      disabled: !isDraggable,
      data: {
        event,
        view,
        height: height || elementRef.current?.offsetHeight || null,
        isMultiDay: eventIsMultiDay,
        multiDayWidth: multiDayWidth,
        dragHandlePosition,
        isFirstDay,
        isLastDay,
      },
    });

  // Handle mouse down to track where on the event the user clicked
  const handleMouseDown = (e: React.MouseEvent) => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      setDragHandlePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Don't render if this event is being dragged
  if (isDragging || activeId === draggableId) {
    return (
      <div
        ref={setNodeRef}
        className="opacity-0"
        style={{ height: height || 'auto' }}
      />
    );
  }

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        height: height || 'auto',
        width:
          eventIsMultiDay && multiDayWidth ? `${multiDayWidth}%` : undefined,
      }
    : {
        height: height || 'auto',
        width:
          eventIsMultiDay && multiDayWidth ? `${multiDayWidth}%` : undefined,
      };

  // Handle touch start to track where on the event the user touched
  const handleTouchStart = (e: React.TouchEvent) => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      if (touch) {
        setDragHandlePosition({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    }
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (elementRef) elementRef.current = node;
      }}
      style={style}
      className="touch-none"
    >
      <EventItem
        event={event}
        view={view}
        showTime={showTime}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isMultiDay={eventIsMultiDay}
        isDragging={isDragging}
        onClick={onClick}
        isSaving={isSaving}
        savingIndicatorTooltip={savingIndicatorTooltip}
        savingToastMessage={savingToastMessage}
        onMouseDown={isDraggable ? handleMouseDown : undefined}
        onTouchStart={isDraggable ? handleTouchStart : undefined}
        dndListeners={isDraggable ? listeners : undefined}
        dndAttributes={isDraggable ? attributes : undefined}
        aria-hidden={ariaHidden}
        mode={mode}
        onDelete={onDelete}
        onConfirm={onConfirm}
        pastIndicatorTooltip={pastIndicatorTooltip}
      />
    </div>
  );
}
