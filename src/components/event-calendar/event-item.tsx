'use client';

import { useMemo } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { format, isPast } from 'date-fns';
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
import { StatusValuePairs } from './constants';

// Using date-fns format with 24-hour formatting:
// 'HH' - hours (00-23) with leading zero
// ':mm' - minutes with leading zero
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(date, 'HH:mm');
};

/**
 * Renders a pill-shaped "Vergangen" indicator.
 *
 * @param compact - When true, use the compact variant with reduced padding and a smaller font size.
 * @param className - Optional additional CSS classes applied to the indicator.
 * @returns A span element displaying "Vergangen" with pill-style visual styling.
 */
function PastIndicator({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-current/15 bg-white/45 font-medium tracking-[0.02em] text-current/75 uppercase dark:bg-black/10',
        compact ? 'px-1 py-0 text-[0.55rem]' : 'px-1.5 py-0.5 text-[0.6rem]',
        className
      )}
    >
      Vergangen
    </span>
  );
}

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

/**
 * Render a styled button wrapper for an event that applies color, border-radius, drag-and-drop bindings, and a past-event state.
 *
 * @param event - Event data used to determine displayed end time, status color, and assigned users.
 * @param isFirstDay - Whether this event is the first day in a multi-day event (affects border radius).
 * @param isLastDay - Whether this event is the last day in a multi-day event (affects border radius).
 * @param isDragging - When true, sets a `data-dragging` attribute to adjust visual appearance while dragging.
 * @param onClick - Click handler forwarded to the button.
 * @param className - Additional CSS classes appended to the wrapper.
 * @param children - Content to render inside the button.
 * @param currentTime - Optional current time used to shift the event's duration for past-state calculation.
 * @param dndListeners - Drag-and-drop listener props spread onto the button.
 * @param dndAttributes - Drag-and-drop attribute props spread onto the button.
 * @param onMouseDown - Mouse down handler forwarded to the button.
 * @param onTouchStart - Touch start handler forwarded to the button.
 * @param mode - Display mode that influences color selection (e.g., helper mode).
 *
 * @returns The button element that visually wraps the event and forwards interaction and drag/drop bindings.
 */
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

  if (
    mode === 'helper' &&
    event.assignedUsers.some((assignedUserId) => assignedUserId === userId)
  ) {
    // User is a helper for this event - only show "eigene" in helper mode
    statusForColor = 'eigene';
  }
  return (
    <button
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-past-event:opacity-75 data-past-event:saturate-50 sm:px-2',
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
  onConfirm?: (eventId: string) => void;
}

/**
 * Render an event as a calendar item for month, week/day, or agenda views, including time display, past-state styling, drag-and-drop bindings, and right-click context-menu integration.
 *
 * @param event - The event object to render (must contain at least `id`, `title`, `start`, `end`, and optional fields like `allDay`, `status`, `assignedUsers`, and `helpersNeeded`).
 * @param view - The current calendar view (`'month'`, `'week'`, `'day'`, or `'agenda'`) which determines layout and content.
 * @param currentTime - Optional override start time used when dragging; when provided, the event's displayed start/end are shifted to this time.
 * @param isFirstDay - Whether this event instance is the first day in a multi-day span, used for corner radius/layout.
 * @param isLastDay - Whether this event instance is the last day in a multi-day span, used for corner radius/layout.
 * @param isDragging - Whether the event is currently being dragged; applied as a visual state.
 * @param showTime - When true (applies to week/day views), render the event's time line beneath the title.
 * @param dndListeners - Drag-and-drop event listeners to spread onto the rendered element.
 * @param dndAttributes - Drag-and-drop attributes to spread onto the rendered element.
 * @param onDelete - Optional delete handler forwarded to the context menu (defaults to a no-op).
 * @param onConfirm - Optional confirm handler forwarded to the context menu when helper confirmation is available.
 * @param mode - Display mode (for example `'helper'`) that affects color selection when the current user is assigned to the event.
 * @param children - Optional custom children to render inside the event wrapper; when omitted a view-specific default layout is used.
 * @param className - Optional additional CSS classes applied to the root element.
 * @param onClick - Click handler for the rendered event element.
 * @param onMouseDown - Mouse-down handler forwarded to the rendered element.
 * @param onTouchStart - Touch-start handler forwarded to the rendered element.
 *
 * @returns A React element that renders the event according to the selected view and props.
 */
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
  onConfirm,
}: EventItemProps) {
  const canConfirm =
    (event.helpersNeeded ?? 0) > 0 &&
    (event.assignedUsers?.length ?? 0) >= (event.helpersNeeded ?? 0) &&
    event.status?.id !== StatusValuePairs.vergeben_bestaetigt;

  // Use the provided currentTime (for dragging) or the event's actual time
  const userId = useSession().data?.user?.id;
  let statusForColor: EinsatzStatus | string = event.status || 'fallback';

  if (
    mode === 'helper' &&
    event.assignedUsers?.some((assignedUserId) => assignedUserId === userId)
  ) {
    // User is a helper for this event - only show "eigene" in helper mode
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

  const getEventTime = () => {
    if (event.allDay) return 'Ganztägig';

    // Always show both start and end time for consistency
    return `${formatTimeWithOptionalMinutes(
      displayStart
    )} - ${formatTimeWithOptionalMinutes(displayEnd)}`;
  };
  const isEventInPast = isPast(displayEnd);

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
            <div className="flex items-start justify-between gap-1">
              {!event.allDay && (
                <div className="text-[0.6875rem] leading-tight font-normal opacity-70 sm:text-[0.6875rem]">
                  <span className="sm:hidden">
                    {formatTimeWithOptionalMinutes(displayStart)}
                  </span>
                  <span className="hidden sm:inline">
                    {formatTimeWithOptionalMinutes(displayStart)}
                    {'-'}
                    {formatTimeWithOptionalMinutes(displayEnd)}
                  </span>
                </div>
              )}
              {isEventInPast && <PastIndicator compact className="ml-auto" />}
            </div>
            <div className="leading-tight wrap-break-word max-md:line-clamp-2">
              {event.title}
            </div>
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
        canConfirm={canConfirm}
        onConfirm={onConfirm}
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
        {isEventInPast && (view === 'week' || view === 'day') && (
          <div>
            <PastIndicator compact />
          </div>
        )}
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
        canConfirm={canConfirm}
        onConfirm={onConfirm}
      />
    );
  }

  // Agenda view - kept separate since it's significantly different
  const agendaView = (
    <button
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:opacity-75 data-past-event:saturate-50',
        getEventColorClasses(statusForColor, mode), // Use statusForColor instead of event.status
        className
      )}
      data-past-event={isEventInPast || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {/* PastIndicator hier nicht benötigt, weil in Agenda sowieso nur zukünftige Events angezeigt werden */}
      <div className="text-sm font-medium">{event.title}</div>
      <div className="text-xs opacity-70">
        {event.allDay ? (
          <span>Ganztägig</span>
        ) : (
          <span className="uppercase">
            {formatTimeWithOptionalMinutes(displayStart) +
              ' - ' +
              formatTimeWithOptionalMinutes(displayEnd)}
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
      canConfirm={canConfirm}
      onConfirm={onConfirm}
    />
  );
}
