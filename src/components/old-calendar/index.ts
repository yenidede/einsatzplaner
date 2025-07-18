// Main component export
export { FullCalendarGroupSchedule } from "./FullCalendarGroupSchedule";

// Individual component exports
export { EventDetailsModal } from "./EventDetailsModal";

// Hook exports
export { useCalendarState } from "./hooks";

// Utility exports
export {
  getLocale,
  transformScheduleToEvents,
  getCalendarConfig,
  formatTimeForDisplay,
} from "./utils";

// Type exports
export type {
  Einsatz,
  SelectedEvent,
  ScheduleGroup,
  CalendarEvent,
  CalendarProps,
  Language,
} from "./types";

// Default export
export { FullCalendarGroupSchedule as default } from "./FullCalendarGroupSchedule";
