export type ActivityStatus = "unread" | "read";
export type ActivityCategory = "ungelesen" | "gelesen";

export interface ChangeLogEntry {
  id: string;
  einsatz_id: string;
  user_id: string;
  type_id: string;
  created_at: Date;
  affected_user: string | null;

  change_type: {
    id: string;
    name: string;
    message: string;
    change_icon_url: string;
    change_color: string;
  };

  user: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  };

  affected_user_data?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
  } | null;

  einsatz: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    all_day: boolean;
    org_id: string;
    einsatz_to_category: Array<{
      id: string;
      category_id: string;
      einsatz_category: {
        id: string;
        value: string;
        abbreviation: string;
      };
    }>;
  };
}

export interface CreateChangeLogInput {
  einsatzId: string;
  userId: string;
  typeId: string;
  affectedUserId?: string | null;
}

export interface ActivityLogFilters {
  einsatzId?: string;
  userId?: string;
  typeId?: string;
  orgId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GroupedActivities {
  ungelesen: ChangeLogEntry[];
  gelesen: ChangeLogEntry[];
}

export interface ActivityLogResult {
  activities: ChangeLogEntry[];
  total: number;
  hasMore: boolean;
}
