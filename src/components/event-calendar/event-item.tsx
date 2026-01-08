'use client';

import { useMemo } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { differenceInMinutes, format, isPast } from 'date-fns';
import { useSession } from 'next-auth/react';

import { cn } from '@/lib/utils';
import {
  getBorderRadiusClasses,
  getEventColorClasses,
  type CalendarEvent,
} from '@/components/event-calendar';
import { CalendarMode } from './types';
import { einsatz_status as EinsatzStatus } from '@/generated/prisma';
import { ContextMenuEventRightClick } from '../context-menu';

// Using date-fns format with 24-hour formatting:
// 'HH' - hours (00-23) with leading zero
// ':mm' - minutes with leading zero
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(date, 'HH:mm');
};

interface EventWrapperProps {
  event: CalendarEvent;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
  currentTime?: Date;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  mode: CalendarMode;
}

// Shared wrapper component for event styling
function EventWrapper({
  event,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  currentTime,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
  mode,
}: EventWrapperProps) {
  // Always use the currentTime (if provided) to determine if the event is in the past
  const displayEnd = currentTime
    ? new Date(
        new Date(currentTime).getTime() +
          (new Date(event.end).getTime() - new Date(event.start).getTime())
      )
    : new Date(event.end);

  const isEventInPast = isPast(displayEnd);
  const userId = useSession().data?.user?.id;
  let statusForColor: EinsatzStatus | string = event.status || 'fallback';

  if (event.assignedUsers.some((assignedUserId) => assignedUserId === userId)) {
    // User is a helper for this event
    statusForColor = 'eigene';
  }
  return (
    <button
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-past-event:line-through sm:px-2',
        getEventColorClasses(statusForColor || 'fallback', mode),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className
      )}
      data-dragging={isDragging || undefined}
      data-past-event={isEventInPast || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  );
}

interface EventItemProps {
  event: CalendarEvent;
  view: 'month' | 'week' | 'day' | 'agenda';
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showTime?: boolean;
  currentTime?: Date; // For updating time during drag
  isFirstDay?: boolean;
  isLastDay?: boolean;
  children?: React.ReactNode;
  className?: string;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  mode: CalendarMode;
  onDelete?: (eventId: string, eventTitle: string) => void;
}

export function EventItem({
  event,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
  mode,
  onDelete,
}: EventItemProps) {
  // Use the provided currentTime (for dragging) or the event's actual time
  const userId = useSession().data?.user?.id;
  let statusForColor: EinsatzStatus | string = event.status || 'fallback';

  if (
    event.assignedUsers?.some((assignedUserId) => assignedUserId === userId)
  ) {
    // User is a helper for this event
    statusForColor = 'eigene';
  }

  const displayStart = useMemo(() => {
    return currentTime || new Date(event.start);
  }, [currentTime, event.start]);

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() +
            (new Date(event.end).getTime() - new Date(event.start).getTime())
        )
      : new Date(event.end);
  }, [currentTime, event.start, event.end]);

  // Calculate event duration in minutes
  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart);
  }, [displayStart, displayEnd]);

  const getEventTime = () => {
    if (event.allDay) return 'All day';

    // Always show both start and end time for consistency
    return `${formatTimeWithOptionalMinutes(
      displayStart
    )} - ${formatTimeWithOptionalMinutes(displayEnd)}`;
  };

  if (view === 'month') {
    const eventWrapper = (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          'mt-(--event-gap) items-center text-[0.7rem] sm:text-xs',
          event.allDay ? 'h-auto py-1' : 'h-auto min-h-fit py-1',
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        mode={mode}
      >
        {children || (
          <div className="flex w-full flex-col">
            {!event.allDay && (
              <div className="text-[0.6875rem] leading-tight font-normal opacity-70 sm:text-[0.6875rem]">
                {formatTimeWithOptionalMinutes(displayStart)}
                {'-'}
                {formatTimeWithOptionalMinutes(displayEnd)}
              </div>
            )}
            <div className="leading-tight wrap-break-word">{event.title}</div>
          </div>
        )}
      </EventWrapper>
    );
    return (
      <ContextMenuEventRightClick
        trigger={eventWrapper}
        heading={event.title}
        asChild={false}
        eventId={event.id}
        eventTitle={event.title}
        onDelete={onDelete || (() => {})}
      />
    );
  }

  if (view === 'week' || view === 'day') {
    const eventWrapper = (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          'flex-col py-1',
          view === 'week' ? 'text-[10px] sm:text-xs' : 'text-xs',
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        mode={mode}
      >
        <div className="leading-tight font-medium wrap-break-word">
          {event.title}
        </div>
        {showTime && (
          <div className="text-[10px] leading-tight font-normal wrap-break-word opacity-70 sm:text-[11px]">
            {getEventTime()}
          </div>
        )}
      </EventWrapper>
    );
    return (
      <ContextMenuEventRightClick
        trigger={eventWrapper}
        heading={event.title}
        asChild={false}
        eventId={event.id}
        eventTitle={event.title}
        onDelete={onDelete || (() => {})}
      />
    );
  }

  // Agenda view - kept separate since it's significantly different
  const agendaView = (
    <button
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:line-through data-past-event:opacity-90',
        getEventColorClasses(statusForColor, mode), // Use statusForColor instead of event.status
        className
      )}
      data-past-event={isPast(new Date(event.end)) || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="text-sm font-medium">{event.title}</div>
      <div className="text-xs opacity-70">
        {event.allDay ? (
          <span>Ganztägig</span>
        ) : (
          <span className="uppercase">
            {formatTimeWithOptionalMinutes(displayStart)}
            {'-'}
            {formatTimeWithOptionalMinutes(displayEnd)}
          </span>
        )}
      </div>
    </button>
  );
  return (
    <ContextMenuEventRightClick
      trigger={agendaView}
      heading={event.title}
      asChild={true}
      eventId={event.id}
      eventTitle={event.title}
      onDelete={onDelete || (() => {})}
    />
  );
}
