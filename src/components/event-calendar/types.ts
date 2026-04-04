export type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'list';
import type { einsatz_status as EinsatzStatus } from '@/generated/prisma';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  status?: EinsatzStatus;
  assignedUsers: string[]; // Array of user IDs assigned to the event
  helpersNeeded?: number;
}

export type CalendarMode = 'helper' | 'verwaltung';

export type EventColor =
  | 'sky'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'emerald'
  | 'orange';

export type FormFieldType =
  | 'default'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'group';
export type SupportedDataTypes =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'currency'
  | 'mail'
  | 'phone';

export type CustomFormField = {
  id: string;
  displayName: string;
  placeholder?: string | null;
  defaultValue?: any;
  required?: boolean;
  groupName?: string | null;
  inputType: FormFieldType;
  dataType: SupportedDataTypes;
  inputProps: React.ComponentProps<'input'> | null;
  isMultiline?: boolean | null;
  min?: number | null;
  max?: number | null;
  allowedValues?: string[];
};
