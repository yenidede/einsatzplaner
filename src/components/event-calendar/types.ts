export type CalendarView = "month" | "week" | "day" | "agenda";
import type { einsatz_status as EinsatzStatus } from "@/generated/prisma";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: EventColor;
  status?: EinsatzStatus;
  location?: string;
  assignedUsers: string[]; // Array of user IDs assigned to the event
}

export type CalendarMode = "helper" | "verwaltung";

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange";

export type FormFieldType = "default" | "select" | "multi-select" | "checkbox";

export type CustomFormField = {
  id: string,
  displayName: string,
  placeholder?: string | null,
  defaultValue?: any,
  required?: boolean,
  groupName?: string | null,
  type: FormFieldType,
  isMultiline?: boolean | null,
  min?: number | null,
  max?: number | null,
  allowedValues?: string[]
}