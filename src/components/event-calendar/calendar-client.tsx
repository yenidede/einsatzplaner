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
import { toast } from "sonner";

export default function Component({
  einsaetze,
  mode,
}: {
  einsaetze: Promise<CalendarEvent[]>;
  mode: CalendarMode;
}) {
  const resolvedEinsaetze = use(einsaetze);

  const [events, setEvents] = useState<CalendarEvent[]>(resolvedEinsaetze);

  const handleEventAdd = async (event: EinsatzCreate) => {
    // generate the uuid here, to allow optimistic updates (bg save to database)
    const newEventId = crypto.randomUUID();
    event.id = newEventId;
    const calendarEvent = await EinsatzCreateToCalendarEvent(event);

    setEvents([...events, calendarEvent]);
    try {
      await createEinsatz({ data: event });
      toast.success("Einsatz '" + event.title + "' wurde erstellt.");
    } catch (error) {
      toast.error("Fehler beim Erstellen des Einsatzes: " + error);
      return;
    }
  };

  const handleEventUpdate = async (updatedEvent: EinsatzCreate) => {
    const calendarEvent = await EinsatzCreateToCalendarEvent(updatedEvent);
    const oldEvent = events.find((e) => e.id === calendarEvent.id);
    setEvents(
      events.map((event) =>
        event.id === calendarEvent.id ? calendarEvent : event
      )
    );
    try {
      await updateEinsatz({ data: updatedEvent });
      toast.success("Einsatz '" + updatedEvent.title + "' wurde aktualisiert.");
    } catch (error) {
      toast.error("Fehler beim Aktualisieren des Einsatzes: " + error);
      console.error("Error updating Einsatz:", error);
      // Revert the event back to its previous state
      setEvents((prevEvents) => {
        if (oldEvent) {
          return prevEvents.map((event) =>
            event.id === oldEvent.id ? oldEvent : event
          );
        }
        return prevEvents;
      });
      return;
    }
  };

  const handleEventDelete = async (eventId: string) => {
    const oldEvent = events.find((event) => event.id === eventId);
    setEvents(events.filter((event) => event.id !== eventId));
    try {
      await deleteEinsatzById(eventId);
      toast.success("Einsatz '" + eventId + "' wurde gelöscht.");
    } catch (error) {
      toast.error("Fehler beim Löschen des Einsatzes: " + error);
      console.error("Error deleting Einsatz:", error);
      // Re-add the event that was attempted to be deleted
      setEvents((prevEvents) => {
        if (oldEvent) {
          return [...prevEvents, oldEvent];
        }
        return prevEvents;
      });
      return;
    }
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
