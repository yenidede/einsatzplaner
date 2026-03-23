import type {
  einsatz as EinsatzRawDb,
  einsatz_comment as CommentRawDb,
  change_log as ChangeLogRawDb,
} from '@/generated/prisma';
export type Einsatz = EinsatzRawDb;
import type {
  einsatz_status as EinsatzStatus,
  einsatz_field as EinsatzField,
  einsatz_category as EinsatzCategory,
  type as FieldType,
} from '@/generated/prisma';

export type { CalendarEvent } from '@/components/event-calendar/types';

export type EinsatzFieldCreate = {
  field_id: string;
  value: string | null;
};

export type EinsatzCreate = {
  id?: string;
  title: string;

  start: Date;
  end: Date;
  all_day?: boolean;

  org_id: string;
  created_by: string;
  assignedUsers?: string[];

  helpers_needed: number;

  participant_count?: number | null;
  price_per_person?: number | null;
  total_price?: number | null;

  categories: string[];
  einsatz_fields: EinsatzFieldCreate[];

  status_id?: string; // newly created einsatz doesnt need status. Only when saving to db.
  template_id?: string;

  userProperties?: Array<{
    user_property_id: string;
    is_required: boolean;
    min_matching_users?: number | null;
  }>;

  anmerkung?: string;
  // TODO:
  // change_log aktualisieren
};
export type EinsatzUserProperty = {
  user_property_id: string;
  is_required: boolean;
  min_matching_users?: number | null;
};
export type EinsatzDetailed = EinsatzRawDb & {
  einsatz_status: EinsatzStatus;
  assigned_users?: string[];
  einsatz_fields: (EinsatzField & {
    field_name: string | null;
    group_name: string | null;
    field_type: { datatype: string | null };
  })[];
  categories: string[];
  change_log: (ChangeLogRawDb & {
    user: { id: string; firstname: string | null; lastname: string | null } | null;
  })[];
  user_properties: EinsatzUserProperty[];
};

/** Detailed einsatz with category abbreviations for calendar event titles (no extra lookup). */
export type EinsatzDetailedForCalendar = EinsatzDetailed & {
  category_abbreviations: string[];
};

export type EinsatzListCustomFieldMeta = {
  key: string;
  label: string;
  datatype: FieldType['datatype'] | null;
  group_name: string | null;
  allowed_values: string[];
};

export type EinsatzListCustomFieldValue = string | number | Date | null;

export type EinsatzListItem = Einsatz & {
  organization_name: string;
  created_by_name: string | null;
  template_name: string | null;
  status_verwalter_text: string;
  status_helper_text: string;
  status_verwalter_color: string;
  status_helper_color: string;
  category_labels: string[];
  category_display: string;
  helper_names: string[];
  helper_display: string;
  helper_count: number;
  custom_fields: Record<string, EinsatzListCustomFieldValue>;
  custom_field_meta: EinsatzListCustomFieldMeta[];
};

export type EinsatzCustomizable = {
  id: string;
  title?: string;
  template_name?: string;

  created_at?: Date;
  updated_at?: Date | null;

  start?: Date;
  end?: Date;
  all_day?: boolean;

  helpers_needed?: number;
  still_needed_helpers?: number;
  assigned_helpers_count?: number;
  assigned_users_name?: string[];
  created_by_name?: string;

  participant_count?: number | null;
  price_per_person?: number | null;
  total_price?: number | null;

  einsatz_status?: EinsatzStatus;
  organization_name?: string;

  categories?: EinsatzCategory[];
  einsatz_fields?: EinsatzField[];
};

export type EinsatzForCalendar = {
  id: string;
  title: string;

  start: Date;
  end: Date;
  all_day: boolean;

  helpers_needed: number;
  einsatz_helper: { user_id: string }[]; // Array of user IDs assigned to the event
  _count: {
    einsatz_helper: number;
  };

  einsatz_status: {
    id: string;
    verwalter_color: string;
    verwalter_text: string;
    helper_color: string;
    helper_text: string;
  };

  einsatz_to_category: {
    einsatz_category: { value: string; abbreviation: string };
  }[];
};
