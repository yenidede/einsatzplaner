import type { EventClickArg } from "@fullcalendar/core";

export interface Einsatz {
  id: string;
  name: string;
  date: Date;
  start_time: Date;
  end_time: Date;
  organization?: {
    name: string;
  };
}

export interface SelectedEvent {
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  organization?: string;
}

export interface ScheduleGroup {
  [date: string]: Einsatz[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    organization?: string;
    name: string;
    date: string;
  };
}

export interface CalendarProps {
  scheduleData?: ScheduleGroup;
  onEventClick?: (eventInfo: EventClickArg) => void;
  maxEventsPerDay?: number;
}

export type Language = "en" | "de";
