"use client";

import { useState, use } from "react";

import { EventCalendar, type CalendarEvent } from "@/components/event-calendar";
import { CalendarMode } from "./types";
import { EinsatzCreateToCalendarEvent } from "./einsatz-service";
import QueryProvider from "../QueryProvider";
import { EinsatzCreate } from "@/features/einsatz/types";
import {
  createEinsatz,
  deleteEinsatzById,
  updateEinsatz,
} from "@/features/einsatz/dal-einsatz";

export default function Component({
  einsaetze,
  mode,
}: {
  einsaetze: Promise<CalendarEvent[]>;
  mode: CalendarMode;
}) {
  const resolvedEinsaetze = use(einsaetze);

  const [events, setEvents] = useState<CalendarEvent[]>(resolvedEinsaetze);

  const handleEventAdd = (event: EinsatzCreate) => {
    const calendarEvent = EinsatzCreateToCalendarEvent(event);
    setEvents([...events, calendarEvent]);
  };

  const handleEventUpdate = (updatedEvent: EinsatzCreate) => {
    const calendarEvent = EinsatzCreateToCalendarEvent(updatedEvent);
    setEvents(
      events.map((event) =>
        event.id === calendarEvent.id ? calendarEvent : event
      )
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId));
  };

  return (
    <QueryProvider>
      <EventCalendar
        events={events}
        onEventAdd={handleEventAdd}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleEventDelete}
        mode={mode}
      />
    </QueryProvider>
  );
}
