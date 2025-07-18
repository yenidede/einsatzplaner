"use client";

// Re-export from the new modular structure
export { FullCalendarGroupSchedule } from "./FullCalendarGroupSchedule";
export type { CalendarProps, Einsatz, ScheduleGroup } from "./types";

// For backward compatibility
export { FullCalendarGroupSchedule as default } from "./FullCalendarGroupSchedule";
