import type { einsatz as EinsatzRawDb } from "@/generated/prisma";
export type Einsatz = EinsatzRawDb;
import type { einsatz_status as EinsatzStatus } from "@/generated/prisma";

export type { CalendarEvent } from "@/components/event-calendar/types";

export type EinsatzForCalendar = {
  id: string;
  title: string;
  start: Date;
  all_day: boolean;
  end: Date;
  einsatz_to_category: {
    einsatz_category: { value: string; abbreviation: string };
  }[];
  status: EinsatzStatus;
  einsatz_helper: { user_id: string }[]; // Array of user IDs assigned to the event
  helpers_needed: number;
  _count: {
    einsatz_helper: number;
  };
};
