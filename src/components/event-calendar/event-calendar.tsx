'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseAsStringEnum, useQueryState } from 'nuqs';
import { RiCalendarCheckLine } from '@remixicon/react';
import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { de } from 'date-fns/locale'; // Add German locale import
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AgendaDaysToShow,
  AgendaView,
  CalendarDndProvider,
  CalendarView,
  DayView,
  EventDialogVerwaltung,
  EventDialogHelfer,
  EventGap,
  EventHeight,
  MonthView,
  WeekCellsHeight,
  WeekView,
  ListView,
} from '@/components/event-calendar';
import { CalendarEvent, CalendarMode } from './types';
import { EinsatzCreate } from '@/features/einsatz/types';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useEventDialog } from '@/hooks/use-event-dialog';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';

export interface EventCalendarProps {
  events?: CalendarEvent[];
  onEventAdd: (event: EinsatzCreate) => void;
  onEventUpdate: (event: EinsatzCreate) => void;
  onAssignToggleEvent: (eventId: string) => void;
  onEventTimeUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string, eventTitle: string) => void;
  onMultiEventDelete: (eventIds: string[]) => void;
  className?: string;
  initialView?: CalendarView;
  mode: CalendarMode;
  activeOrgId?: string | null;
}
// TODO: onEventSelect, update should also properly handle dnd (only time changes)
export function EventCalendar({
  events = [],
  onEventAdd,
  onEventUpdate,
  onAssignToggleEvent,
  onEventTimeUpdate,
  onEventDelete,
  onMultiEventDelete,
  className,
  initialView = 'month',
  mode,
  activeOrgId,
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    isOpen: isEventDialogOpen,
    selectedEinsatz,
    openDialog,
    closeDialog,
  } = useEventDialog();

  const [view, setView] = useQueryState<CalendarView>(
    'view',
    parseAsStringEnum<CalendarView>([
      'month',
      'week',
      'day',
      'agenda',
      'list',
    ]).withDefault(initialView)
  );

  // German view names mapping
  const viewLabels = {
    month: 'Monat',
    week: 'Woche',
    day: 'Tag',
    agenda: 'Agenda',
    list: 'Liste',
  } as const;

  const { data: sessionData } = useSession();
  const orgIds = sessionData?.user.orgIds;
  const { data: organizations } = useOrganizations(orgIds);

  const { einsatz_singular, einsatz_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  // Add keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea or^ contentEditable element
      // or if the event dialog is open
      if (
        isEventDialogOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          setView('month');
          break;
        case 'w':
          setView('week');
          break;
        case 't':
          setView('day');
          break;
        case 'a':
          setView('agenda');
          break;
        case 'l':
          setView('list');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEventDialogOpen, setView]);

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (view === 'agenda') {
      setCurrentDate(addDays(currentDate, -AgendaDaysToShow));
    } else if (view === 'list') {
      setCurrentDate(addDays(currentDate, -AgendaDaysToShow));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === 'agenda') {
      setCurrentDate(addDays(currentDate, AgendaDaysToShow));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventSelect = (event: CalendarEvent | string) => {
    openDialog(typeof event === 'string' ? event : event.id);
  };

  const handleEventCreate = (startTime: Date) => {
    console.log('Creating new event at:', startTime); // Debug log

    // Snap to 15-minute intervals
    const minutes = startTime.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      if (remainder < 7.5) {
        // Round down to nearest 15 min
        startTime.setMinutes(minutes - remainder);
      } else {
        // Round up to nearest 15 min
        startTime.setMinutes(minutes + (15 - remainder));
      }
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    }

    if (!activeOrgId) {
      console.error('No organization selected or available');
      return;
    }

    const userId = sessionData?.user?.id;
    if (!userId) {
      toast.error('Keine Benutzerdaten gefunden.');
      return;
    }

    const newEvent: EinsatzCreate = {
      title: '',
      start: startTime,
      end: addHours(startTime, 1),
      org_id: activeOrgId,
      created_by: userId,
      helpers_needed: 0,
      categories: [],
      einsatz_fields: [],
    };
    openDialog(newEvent);
  };

  const handleEventSave = (event: EinsatzCreate | CalendarEvent) => {
    // Type guard to determine which type we're dealing with
    if ('org_id' in event) {
      // This is an EinsatzCreate
      if (event.id) {
        onEventUpdate?.(event);
      } else {
        onEventAdd?.(event);
      }
    } else {
      // This is a CalendarEvent
      onEventTimeUpdate?.(event);
    }

    closeDialog();
  };

  const handleAssignToggleEvent = (eventId: string) => {
    onAssignToggleEvent(eventId);

    closeDialog();
  };

  const handleEventDelete = (eventId: string, eventTitle: string) => {
    onEventDelete?.(eventId, eventTitle);
    closeDialog();
  };

  const handleMultiEventDelete = (eventIds: string[]) => {
    onMultiEventDelete?.(eventIds);
    closeDialog();
  };

  const handleEventUpdate = (updatedEvent: EinsatzCreate | CalendarEvent) => {
    // Type guard to handle both types
    if ('org_id' in updatedEvent) {
      onEventUpdate?.(updatedEvent);
    } else {
      onEventTimeUpdate?.(updatedEvent);
    }
  };

  const viewTitle = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: de });
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (isSameMonth(start, end)) {
        return format(start, 'MMMM yyyy', { locale: de });
      } else {
        return `${format(start, 'MMM', { locale: de })} - ${format(
          end,
          'MMM yyyy',
          { locale: de }
        )}`;
      }
    } else if (view === 'day') {
      return (
        <>
          <span className="min-[480px]:hidden" aria-hidden="true">
            {format(currentDate, 'MMM d, yyyy', { locale: de })}
          </span>
          <span className="max-[479px]:hidden md:hidden" aria-hidden="true">
            {format(currentDate, 'MMMM d, yyyy', { locale: de })}
          </span>
          <span className="max-md:hidden">
            {format(currentDate, 'EEE MMMM d, yyyy', { locale: de })}
          </span>
        </>
      );
    } else if (view === 'agenda') {
      // Show the month range for agenda view
      const start = currentDate;
      const end = addDays(currentDate, AgendaDaysToShow - 1);

      if (isSameMonth(start, end)) {
        return format(start, 'MMMM yyyy', { locale: de });
      } else {
        return `${format(start, 'MMM', { locale: de })} - ${format(
          end,
          'MMM yyyy',
          { locale: de }
        )}`;
      }
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: de });
    }
  }, [currentDate, view]);

  return (
    <div
      className="flex flex-col rounded-lg border has-data-[slot=month-view]:flex-1"
      style={
        {
          '--event-height': `${EventHeight}px`,
          '--event-gap': `${EventGap}px`,
          '--week-cells-height': `${WeekCellsHeight}px`,
        } as React.CSSProperties
      }
    >
      <CalendarDndProvider
        onEventUpdate={handleEventUpdate}
        mode={mode}
        disableDragAndDrop={mode !== 'verwaltung'}
      >
        <div
          className={cn(
            'flex items-center justify-between px-1 py-2',
            className
          )}
        >
          {view !== 'list' && (
            <div className="flex items-center gap-1 sm:gap-4">
              <Button
                variant="outline"
                className="max-[479px]:aspect-square max-[479px]:p-0!"
                onClick={handleToday}
              >
                <RiCalendarCheckLine
                  className="min-[480px]:hidden"
                  size={16}
                  aria-hidden="true"
                />
                <span className="max-[479px]:sr-only">Heute</span>
              </Button>
              <div className="flex items-center sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  aria-label="Previous"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  aria-label="Next"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </div>
              <h2 className="text-sm font-semibold sm:text-lg md:text-xl">
                {viewTitle}
              </h2>
            </div>
          )}
          {view === 'list' && <h2>Tabellenansicht</h2>}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 max-[479px]:h-8">
                  <span>
                    <span className="min-[480px]:hidden" aria-hidden="true">
                      {viewLabels[view].charAt(0)}
                    </span>
                    <span className="max-[479px]:sr-only">
                      {viewLabels[view]}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className="-me-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-32">
                <DropdownMenuItem onClick={() => setView('month')}>
                  Monat <DropdownMenuShortcut>M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('week')}>
                  Woche <DropdownMenuShortcut>W</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('day')}>
                  Tag <DropdownMenuShortcut>T</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('agenda')}>
                  Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
                </DropdownMenuItem>{' '}
                <DropdownMenuItem onClick={() => setView('list')}>
                  Liste <DropdownMenuShortcut>L</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {mode === 'verwaltung' && (
              <Button
                className="max-[479px]:aspect-square max-[479px]:p-0!"
                onClick={() => {
                  openDialog(null); // Ensure we're creating a new event
                }}
              >
                <PlusIcon
                  className="opacity-60 sm:-ms-1"
                  size={16}
                  aria-hidden="true"
                />
                <span className="max-sm:sr-only">
                  {einsatz_singular} hinzufügen
                </span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {events.length === 0 && (
            <div className="m-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
              Noch keine {einsatz_plural} vorhanden.
            </div>
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleEventCreate}
              mode={mode}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleEventCreate}
              mode={mode}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleEventCreate}
              mode={mode}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              mode={mode}
            />
          )}
          {view === 'list' && (
            <ListView
              onEventEdit={handleEventSelect}
              onEventCreate={handleEventCreate}
              onEventDelete={handleEventDelete}
              onMultiEventDelete={handleMultiEventDelete}
              mode={mode}
            />
          )}
        </div>

        {mode === 'verwaltung' ? (
          <EventDialogVerwaltung
            einsatz={selectedEinsatz}
            isOpen={isEventDialogOpen}
            onClose={closeDialog}
            onSave={handleEventSave}
            onDelete={handleEventDelete}
          />
        ) : mode === 'helper' ? (
          <EventDialogHelfer
            einsatz={
              typeof selectedEinsatz === 'string'
                ? selectedEinsatz
                : selectedEinsatz?.id || null
            }
            isOpen={isEventDialogOpen}
            onClose={closeDialog}
            onAssignToggleEvent={handleAssignToggleEvent}
          />
        ) : null}
      </CalendarDndProvider>
    </div>
  );
}
