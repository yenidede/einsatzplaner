import type { einsatz as EinsatzRawDb, einsatz_comment as CommentRawDb, change_log as ChangeLogRawDb } from "@/generated/prisma";
export type Einsatz = EinsatzRawDb;
import type {
  einsatz_status as EinsatzStatus,
  einsatz_field as EinsatzField,
  field as Field,
} from "@/generated/prisma";

export type { CalendarEvent } from "@/components/event-calendar/types";

export type EinsatzDetailed = EinsatzRawDb & {
  einsatz_status: EinsatzStatus;
  assigned_users?: string[];
  einsatz_fields: EinsatzField[];
  categories: string[];
  comments: (CommentRawDb & { user: { id: string; firstname: string | null; lastname: string | null } })[];
  change_log: (ChangeLogRawDb & { user: { id: string; firstname: string | null; lastname: string | null } })[];
}

export type EinsatzForCalendar = {
  id: string;
  title: string;
  start: Date;
  all_day: boolean;
  end: Date;
  einsatz_to_category: {
    einsatz_category: { value: string; abbreviation: string };
  }[];
  einsatz_status: {
    id: string;
    verwalter_color: string;
    verwalter_text: string;
    helper_color: string;
    helper_text: string;
  };
  einsatz_helper: { user_id: string }[]; // Array of user IDs assigned to the event
  helpers_needed: number;
  _count: {
    einsatz_helper: number;
  };
};

export type EinsatzFieldCreate = {
  field_id: string,
  value: any | null,
}

export type EinsatzCreate = {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  org_id: string;
  created_by: string;
  helpers_needed: number;
  categories: string[];
  einsatz_fields: EinsatzFieldCreate[];
  assignedUsers?: string[];
  status_id?: string; // newly created einsatz doesnt need status. Only when saving to db.
  template_id?: string;
  all_day?: boolean;
  participant_count?: number | null;
  price_per_person?: number | null;
  total_price?: number | null;

  // TODO: 
  // change_log aktualisieren
}
