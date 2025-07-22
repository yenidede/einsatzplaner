import { isSameDay } from "date-fns";

import type { CalendarEvent } from "@/components/event-calendar";
import { einsatz_status as EinsatzStatus } from "@/generated/prisma";
import { CalendarMode } from "./types";

/**
 * Get CSS classes for event colors
 */
export function getEventColorClasses(
  status: EinsatzStatus | string,
  mode: CalendarMode
): string {
  if (typeof status === "string") {
    switch (status) {
      case "eigene":
        return "bg-blue-200/50 hover:bg-blue-200/40 text-blue-950/80 dark:bg-blue-400/25 dark:hover:bg-blue-400/20 dark:text-blue-200 shadow-blue-700/8";
      default:
        return "bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8";
    }
  }
  if (mode === "helper") {
    switch (status.helper_text) {
      case "vergeben":
        return "bg-red-200/50 hover:bg-red-200/40 text-red-950/80 dark:bg-red-400/25 dark:hover:bg-red-400/20 dark:text-red-200 shadow-red-700/8";
      case "offen":
        return "bg-lime-200/50 hover:bg-lime-200/40 text-lime-950/80 dark:bg-lime-400/25 dark:hover:bg-lime-400/20 dark:text-lime-200 shadow-lime-700/8";
      default:
        return "bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8";
    }
  } else {
    // (mode === "verwaltung")
    switch (status.verwalter_text) {
      case "offen":
        return "bg-red-200/50 hover:bg-red-200/40 text-red-950/80 dark:bg-red-400/25 dark:hover:bg-red-400/20 dark:text-red-200 shadow-red-700/8";
      case "vergeben":
        return "bg-orange-200/50 hover:bg-orange-200/40 text-orange-950/80 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200 shadow-orange-700/8";
      case "bestätigt":
        return "bg-green-200/50 hover:bg-green-200/40 text-green-950/80 dark:bg-green-400/25 dark:hover:bg-green-400/20 dark:text-green-200 shadow-green-700/8";
      default:
        return "bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8";
    }
  }
}

/**
 * Get CSS classes for border radius based on event position in multi-day events
 */
export function getBorderRadiusClasses(
  isFirstDay: boolean,
  isLastDay: boolean
): string {
  if (isFirstDay && isLastDay) {
    return "rounded"; // Both ends rounded
  } else if (isFirstDay) {
    return "rounded-l rounded-r-none"; // Only left end rounded
  } else if (isLastDay) {
    return "rounded-r rounded-l-none"; // Only right end rounded
  } else {
    return "rounded-none"; // No rounded corners
  }
}

/**
 * Check if an event is a multi-day event
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  return event.allDay || eventStart.getDate() !== eventEnd.getDate();
}

/**
 * Filter events for a specific day
 */
export function getEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events
    .filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(day, eventStart);
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Sort events with multi-day events first, then by start time
 */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aIsMultiDay = isMultiDayEvent(a);
    const bIsMultiDay = isMultiDayEvent(b);

    if (aIsMultiDay && !bIsMultiDay) return -1;
    if (!aIsMultiDay && bIsMultiDay) return 1;

    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

/**
 * Get multi-day events that span across a specific day (but don't start on that day)
 */
export function getSpanningEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events.filter((event) => {
    if (!isMultiDayEvent(event)) return false;

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Only include if it's not the start day but is either the end day or a middle day
    return (
      !isSameDay(day, eventStart) &&
      (isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd))
    );
  });
}

/**
 * Get all events visible on a specific day (starting, ending, or spanning)
 */
export function getAllEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return (
      isSameDay(day, eventStart) ||
      isSameDay(day, eventEnd) ||
      (day > eventStart && day < eventEnd)
    );
  });
}

/**
 * Get all events for a day (for agenda view)
 */
export function getAgendaEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events
    .filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        isSameDay(day, eventStart) ||
        isSameDay(day, eventEnd) ||
        (day > eventStart && day < eventEnd)
      );
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
