"use client";

import { useState, use } from "react";

import { EventCalendar, type CalendarEvent } from "@/components/event-calendar";
import { CalendarMode } from "./types";

export default function Component({
  einsaetze,
  mode,
}: {
  einsaetze: Promise<CalendarEvent[]>;
  mode: CalendarMode;
}) {
  const resolvedEinsaetze = use(einsaetze);

  const [events, setEvents] = useState<CalendarEvent[]>(resolvedEinsaetze);

  const handleEventAdd = (event: CalendarEvent) => {
    setEvents([...events, event]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents(
      events.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId));
  };

  return (
    <EventCalendar
      events={events}
      onEventAdd={handleEventAdd}
      onEventUpdate={handleEventUpdate}
      onEventDelete={handleEventDelete}
      mode={mode}
    />
  );
}
