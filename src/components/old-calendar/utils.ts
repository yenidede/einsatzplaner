"use client";

import { format } from "date-fns";
import enLocale from "@fullcalendar/core/locales/en-gb";
import deLocale from "@fullcalendar/core/locales/de";
import type { CalendarEvent, Einsatz, Language, ScheduleGroup } from "./types";

/**
 * Get the appropriate locale configuration for FullCalendar
 */
export const getLocale = (language: Language) => {
  // Dynamically import locales to avoid SSR issues
  switch (language) {
    case "en":
      return enLocale;
    case "de":
      return deLocale;
    default:
      return deLocale;
  }
};

/**
 * Transform schedule data into FullCalendar event format
 */
export const transformScheduleToEvents = (
  scheduleData: ScheduleGroup
): CalendarEvent[] => {
  if (!scheduleData) return [];

  const allEvents: CalendarEvent[] = [];

  try {
    Object.entries(scheduleData).forEach(([date, dayEvents]) => {
      if (!dayEvents || !Array.isArray(dayEvents)) return;

      const mappedEvents = dayEvents
        .filter((event: Einsatz) => event && event.id && event.name)
        .map((event: Einsatz, index: number) => ({
          id: `${date}-${event.id}-${index}`,
          title: event.name,
          start: `${date}T${format(event.start_time, "HH:mm")}`,
          end: `${date}T${format(event.end_time, "HH:mm")}`,
          extendedProps: {
            organization: event.organization?.name,
            name: event.name,
            date: date,
          },
        }));

      allEvents.push(...mappedEvents);
    });
  } catch (error) {
    console.error("Error transforming schedule data:", error);
    return [];
  }

  return allEvents;
};

/**
 * Get default calendar configuration
 */
export const getCalendarConfig = () => ({
  slotLabelFormat: {
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12: false,
  },
  eventTimeFormat: {
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12: false,
  },
  slotMinTime: "06:00:00",
  slotDuration: "00:30:00",
  slotMaxTime: "22:00:00",
  allDaySlot: false,
  editable: true,
  selectable: true,
  selectMirror: true,
  weekends: true,
  nowIndicator: true,
});

/**
 * Format time for display
 */
export const formatTimeForDisplay = (date: Date | null): string => {
  try {
    if (!date) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};
