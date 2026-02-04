'use client';

import { useMemo } from 'react';
import { RiCalendarEventLine } from '@remixicon/react';
import { format, isToday, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

import { CalendarEvent, EventItem } from '@/components/event-calendar';
import { CalendarMode } from './types';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useSession } from 'next-auth/react';
import { Loader } from 'lucide-react';

interface AgendaViewProps {
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  mode: CalendarMode;
  onEventConfirm?: (eventId: string) => void;
}

export function AgendaView({
  events,
  onEventSelect,
  mode,
  onEventConfirm,
}: AgendaViewProps) {
  const { data: session } = useSession();
  const activeOrgId = session?.user?.activeOrganization?.id;
  const { data: organizations } = useOrganizations(session?.user.orgIds);
  const { einsatz_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );
  // Filter events that are in the future and group them by day
  const futureEventsByDay = useMemo(() => {
    const today = startOfDay(new Date());

    // Filter events that end today or later
    const futureEvents = events.filter((event) => {
      const eventEnd = startOfDay(new Date(event.end));
      return eventEnd >= today;
    });

    // Group events by their start date
    const eventsByDay = new Map<string, CalendarEvent[]>();

    futureEvents.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startDay = startOfDay(eventStart);
      const endDay = startOfDay(eventEnd);

      // Get all days this event spans, but only from today onwards
      let currentDay = new Date(startDay);
      // If the event started before today, start from today instead
      if (currentDay < today) {
        currentDay = new Date(today);
      }

      while (currentDay <= endDay) {
        const dayKey = currentDay.toISOString();
        if (!eventsByDay.has(dayKey)) {
          eventsByDay.set(dayKey, []);
        }
        eventsByDay.get(dayKey)!.push(event);
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    // Convert to array and sort by date
    const sortedDays = Array.from(eventsByDay.entries())
      .map(([dateStr, dayEvents]) => ({
        date: new Date(dateStr),
        events: dayEvents.sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        ),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return sortedDays;
  }, [events]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  return (
    <div className="border-border/70 border-t px-4">
      {futureEventsByDay.length === 0 ? (
        <div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
          <RiCalendarEventLine
            size={32}
            className="text-muted-foreground/50 mb-2"
          />
          <h3 className="text-lg font-medium">
            Keine geplanten {einsatz_plural}
          </h3>
          <p className="text-muted-foreground flex items-center gap-2">
            Lade {einsatz_plural}... <Loader className="animate-spin" />
          </p>
        </div>
      ) : (
        futureEventsByDay.map(({ date, events: dayEvents }) => (
          <div
            key={date.toISOString()}
            className="border-border/70 relative my-12 border-t"
          >
            <span
              className="bg-background absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
              data-today={isToday(date) || undefined}
            >
              {format(date, 'd MMM, EEEE', { locale: de })}
            </span>
            <div className="mt-6 space-y-2">
              {dayEvents.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  view="agenda"
                  onClick={(e) => handleEventClick(event, e)}
                  mode={mode}
                  onConfirm={onEventConfirm}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
