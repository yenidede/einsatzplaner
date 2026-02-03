import { isSameDay } from 'date-fns';

import {
  einsatz_status,
  einsatz_status as EinsatzStatus,
} from '@/generated/prisma';
import { CalendarEvent, CalendarMode, FormFieldType } from './types';
import { z } from 'zod';
import {
  EinsatzCustomizable,
  EinsatzForCalendar,
} from '@/features/einsatz/types';
import React from 'react';
import { getAllEinsaetzeForCalendar } from '@/features/einsatz/dal-einsatz';
import { ShowDialogFn } from '@/contexts/AlertDialogContext';
import { toast } from 'sonner';
import { PdfGenerationRequest } from '@/features/pdf/types/types';
import { UsePdfGeneratorReturn } from '@/features/pdf/hooks/usePdfGenerator';

/**
 * Generates a Zod schema dynamically based on user-added fields.
 * @param fields - Array of field definitions with name and type.
 * @returns A Zod object schema.
 * @throws Error if an unsupported field type is encountered.
 */

type ValidationOptions = {
  isMultiline?: boolean | null;
  isRequired?: boolean | null;
  min?: number | null;
  max?: number | null;
  allowedValues?: string[] | null;
};

export const handleDelete = async (
  einsatz_singular: string,
  einsatz: { id: string | undefined; title: string },
  showDialog: ShowDialogFn,
  onDelete: (id: string, title: string) => void
) => {
  if (einsatz?.id) {
    const result = await showDialog({
      title: einsatz_singular + ' löschen',
      description: `Sind Sie sicher, dass Sie "${einsatz.title}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
    });

    if (result === 'success') {
      onDelete(einsatz.id, einsatz.title);
    }
  }
};

export const handlePdfGenerate = async (
  einsatz_singular: string,
  einsatz: { id: string | undefined; title: string },
  generatePdf: UsePdfGeneratorReturn['generatePdf']
) => {
  if (!einsatz?.id) {
    toast.error(`${einsatz_singular} nicht gefunden für PDF-Generierung.`);
    return;
  }
  const request: PdfGenerationRequest = {
    type: 'booking-confirmation',
    einsatzId: einsatz.id,
  };
  const t = toast.loading(
    `Generiere PDF für ${einsatz_singular} '${einsatz.title}'...`
  );

  const result = await generatePdf(request);
  if (!result) {
    toast.error(
      `Fehler bei der PDF-Generierung für ${einsatz_singular} '${einsatz.title}'.`
    );
  } else {
    toast.success(
      `PDF für ${einsatz_singular} '${einsatz.title}' wurde generiert.`
    );
  }
  toast.dismiss(t);
};

export function generateDynamicSchema(
  fields: {
    fieldId: string;
    type: string | null | undefined;
    options: ValidationOptions;
  }[]
) {
  const schemaShape: Record<string, z.ZodType<any>> = {};

  fields.forEach((field) => {
    const { fieldId, type, options } = field;

    if (!type) {
      console.warn('no type specified:', field);
      return;
    }

    let fieldSchema;

    switch (type) {
      case 'text':
        if (options.isRequired === true) {
          fieldSchema = z.string().min(1, 'Text darf nicht leer sein');
          if (options.min) fieldSchema = fieldSchema.min(options.min);
          if (options.max) fieldSchema = fieldSchema.max(options.max);
        } else {
          fieldSchema = z
            .union([z.string(), z.null(), z.literal('')])
            .optional()
            .transform((s) => (s == null || s === '' ? '' : String(s)));
          let postTransform = z.string();
          if (options.min != null) {
            postTransform = postTransform.refine(
              (s) => s === '' || s.length >= options.min!,
              { message: `Mindestlänge: ${options.min} Zeichen` }
            );
          }
          if (options.max != null) {
            postTransform = postTransform.max(options.max);
          }
          fieldSchema = fieldSchema.pipe(postTransform);
        }
        break;
      case 'number':
        if (options.isRequired === true) {
          fieldSchema = z.int();
          if (options.min) fieldSchema = fieldSchema.gte(options.min);
          if (options.max) fieldSchema = fieldSchema.lte(options.max);
        } else {
          fieldSchema = z
            .union([z.number(), z.nan(), z.null(), z.undefined()])
            .optional()
            .transform((n) =>
              n == null || Number.isNaN(n) ? undefined : Number(n)
            );
          let numSchema = z.number();
          if (options.min != null) numSchema = numSchema.gte(options.min);
          if (options.max != null) numSchema = numSchema.lte(options.max);
          fieldSchema = fieldSchema.pipe(numSchema.optional());
        }
        break;
      case 'currency':
        if (options.isRequired === true) {
          fieldSchema = z.float64();
          if (options.min != null) fieldSchema = fieldSchema.gte(options.min);
          if (options.max != null) fieldSchema = fieldSchema.lte(options.max);
        } else {
          fieldSchema = z
            .union([z.number(), z.nan(), z.null(), z.undefined()])
            .optional()
            .transform((n) =>
              n == null || Number.isNaN(n) ? undefined : Number(n)
            );
          let numSchema = z.float64();
          if (options.min != null) numSchema = numSchema.gte(options.min);
          if (options.max != null) numSchema = numSchema.lte(options.max);
          fieldSchema = fieldSchema.pipe(numSchema.optional());
        }
        break;
      case 'boolean':
        fieldSchema = z
          .union([z.boolean(), z.null(), z.undefined()])
          .optional()
          .transform((v) => v ?? false);
        break;
      case 'phone':
        fieldSchema = z
          .string()
          .regex(
            /^\+[1-9]\d{1,14}$/,
            'Ungültige Telefonnummer. Beispiel: +1234567890'
          );
        break;
      case 'mail':
        fieldSchema = z.email('Ungültige E-Mail-Adresse');
        break;
      case 'select':
        if (!options.allowedValues || options.allowedValues.length === 0)
          throw new Error('Auswahlfeld benötigt allowedValues');
        // als duple (mindestens 1 Wert)
        fieldSchema = z.enum(options.allowedValues as [string, ...string[]]);
        // Also allow the value to remain null if not required
        if (options.isRequired !== true) {
          fieldSchema = z
            .union([fieldSchema, z.literal('_null_'), z.literal(''), z.null()])
            .optional()
            .transform((data) => {
              if (data === '_null_') return null;
              return data;
            });
        }
        break;
      default:
        throw new Error('Feldtyp ' + type + ' wird nicht unterstützt');
    }
    if (options.isRequired !== true && type !== 'select' && type !== 'boolean')
      fieldSchema = fieldSchema?.optional();

    if (fieldSchema) schemaShape[fieldId] = fieldSchema;
  });

  return z.object(schemaShape);
}

export async function getEinsaetzeData(activeOrgId: string | null | undefined) {
  const einsaetzeRaw = await getAllEinsaetzeForCalendar(
    activeOrgId ? [activeOrgId] : []
  );
  if (einsaetzeRaw instanceof Response) {
    return einsaetzeRaw;
  }

  return mapEinsaetzeToCalendarEvents(einsaetzeRaw);
}

export const mapEinsaetzeToCalendarEvents = (
  einsaetze: EinsatzForCalendar[]
): CalendarEvent[] => {
  return einsaetze.reduce<CalendarEvent[]>((events, einsatz) => {
    const event = mapEinsatzToCalendarEvent(einsatz);
    if (event) {
      events.push(event);
    }
    return events;
  }, []);
};

export const mapEinsatzToCalendarEvent = (
  einsatz: EinsatzForCalendar | null
): CalendarEvent | null => {
  if (!einsatz) {
    return null;
  }
  const categories = einsatz.einsatz_to_category;
  const hasCategories = categories && categories.length > 0;

  return {
    id: einsatz.id,
    title: hasCategories
      ? `${einsatz.title} (${categories
        .map((c) => c.einsatz_category.abbreviation)
        .join(', ')})`
      : einsatz.title,
    start: einsatz.start,
    end: einsatz.end,
    allDay: einsatz.all_day,
    status: einsatz.einsatz_status,
    assignedUsers: einsatz.einsatz_helper.map((helper) => helper.user_id),
  };
};

export function mapStringValueToType(
  value: string | null | undefined,
  fieldType: string | undefined | null
) {
  if (value === null || value === undefined || value === '') return null;
  if (!fieldType) return value; // return as is (text)

  let result: unknown;
  switch (fieldType) {
    case 'text':
    case 'phone':
    case 'mail':
    case 'date':
    case 'time':
    case 'group':
      result = value;
      break;
    case 'number':
      result = parseInt(value, 10);
      break;
    case 'currency':
      result = parseFloat(value);
      break;
    case 'boolean':
      result = value === 'TRUE';
      break;
    case 'select':
      result = value;
      break;
    case 'multiselect':
      // Note: multiselect values are stored as comma-separated strings
      result = value.split(',');
      break;
    default:
      throw new Error('Nicht unterstützter Typ für Mapping: ' + fieldType);
  }
  return result;
}

export function mapTypeToStringValue(value: any): string | null {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === '_null_'
  )
    return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime()))
      throw new Error('Ungültiges Datumsobjekt: ' + value);
    return value.toISOString();
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (Number.isNaN(value) || value === Infinity || value === -Infinity) {
    return null;
  }
  return value.toString();
}

type fieldsForSchema = {
  field: {
    type: {
      datatype: string | null;
    } | null;
    id: string;
    is_multiline: boolean | null;
    is_required: boolean;
    min: number | null;
    max: number | null;
    allowed_values: string[];
    name: string | null;
    placeholder: string | null;
    default_value: string | null;
    group_name: string | null;
  };
}[];

export function mapFieldsForSchema(fields: fieldsForSchema) {
  return fields.map((f) => {
    return {
      fieldId: f.field.id,
      type: f.field.type?.datatype,
      options: {
        isMultiline: f.field.is_multiline,
        isRequired: f.field.is_required === true,
        min: f.field.min,
        max: f.field.max,
        allowedValues: f.field.allowed_values,
      },
    };
  });
}

export function mapDbDataTypeToFormFieldType(
  datatype: string | null | undefined
): FormFieldType {
  const defaultTypes = [
    'text',
    'number',
    'currency',
    'phone',
    'mail',
    'date',
    'time',
  ];
  if (datatype) {
    if (defaultTypes.includes(datatype)) return 'default';
    if (datatype === 'boolean') return 'checkbox';
    if (datatype === 'select') return 'select';
    if (datatype === 'group') return 'group';
  }
  throw new Error(
    'Datentyp kann nicht zugeordnet werden: ' +
    datatype +
    ' zu seinem FormField.'
  );
}

export function mapDbDataTypeToInputProps(
  datatype: string | null | undefined
): React.ComponentProps<'input'> | null {
  const defaultTypes = [
    'text',
    'number',
    'currency',
    'phone',
    'mail',
    'date',
    'time',
  ];
  if (datatype) {
    if (!defaultTypes.includes(datatype) && datatype !== 'group') return null;
    if (datatype === 'text') return { type: 'text' };
    if (datatype === 'phone') return { type: 'tel' };
    if (datatype === 'mail') return { type: 'email' };
    if (datatype === 'number') return { type: 'number' };
    if (datatype === 'currency') return { type: 'number', step: '0.10' };
    if (datatype === 'date') return { type: 'date' };
    if (datatype === 'time') return { type: 'time' };
    // if (datatype === 'group') return { type: 'group' }; // not supported yet
  }
  throw new Error(
    'Datentyp kann nicht zugeordnet werden: ' +
    datatype +
    ' zu seinem FormField.'
  );
}

export const roundDownTo10Minutes = (date: Date): Date => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 10;

  if (remainder === 0) {
    return rounded; // Already rounded
  }

  // Round to nearest 10-minute mark
  const roundedMinutes = minutes - remainder;

  rounded.setMinutes(roundedMinutes, 0, 0); // Also reset seconds and milliseconds
  return rounded;
};

export const isEventPast = (event: EinsatzCustomizable): boolean => {
  return event.end ? new Date(event.end) < new Date() : false;
};

export function mapStatusIdsToLabels(
  value: any[],
  statusData: EinsatzStatus[],
  mode: string
) {
  const labels = Array.from(
    new Set(
      value
        .map((statusId) => {
          const status = statusData.find((s) => s.id === statusId);
          if (!status) return null;
          return mode === 'helper' ? status.helper_text : status.verwalter_text;
        })
        .filter((label): label is string => label !== null)
    )
  );
  return labels;
}

/**
 * Get CSS classes for event colors
 */
export function getEventColorClasses(
  status: EinsatzStatus | string,
  mode: CalendarMode
): string {
  if (typeof status === 'string') {
    switch (status) {
      case 'eigene':
        return 'bg-blue-200/50 hover:bg-blue-200/40 text-blue-950/80 dark:bg-blue-400/25 dark:hover:bg-blue-400/20 dark:text-blue-200 shadow-blue-700/8';
      default:
        return 'bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8';
    }
  }
  if (mode === 'helper') {
    switch (status.helper_text) {
      case 'vergeben':
        return 'bg-red-200/50 hover:bg-red-200/40 text-red-950/80 dark:bg-red-400/25 dark:hover:bg-red-400/20 dark:text-red-200 shadow-red-700/8';
      case 'offen':
        return 'bg-lime-200/50 hover:bg-lime-200/40 text-lime-950/80 dark:bg-lime-400/25 dark:hover:bg-lime-400/20 dark:text-lime-200 shadow-lime-700/8';
      default:
        return 'bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8';
    }
  } else if (mode === 'verwaltung') {
    switch (status.verwalter_text) {
      case 'offen':
        return 'bg-red-200/50 hover:bg-red-200/40 text-red-950/80 dark:bg-red-400/25 dark:hover:bg-red-400/20 dark:text-red-200 shadow-red-700/8';
      case 'vergeben':
        return 'bg-orange-200/50 hover:bg-orange-200/40 text-orange-950/80 dark:bg-orange-400/25 dark:hover:bg-orange-400/20 dark:text-orange-200 shadow-orange-700/8';
      case 'bestätigt':
        return 'bg-green-200/50 hover:bg-green-200/40 text-green-950/80 dark:bg-green-400/25 dark:hover:bg-green-400/20 dark:text-green-200 shadow-green-700/8';
      default:
        return 'bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8';
    }
  } else {
    console.warn('Unknown mode:', mode);
    return 'bg-slate-200/50 hover:bg-slate-200/40 text-slate-950/80 dark:bg-slate-400/25 dark:hover:bg-slate-400/20 dark:text-slate-200 shadow-slate-700/8';
  }
}

type reducedStatus = { id: string; text: string; color: string };

export function getStatusByMode(
  status: einsatz_status | string,
  mode: CalendarMode
): reducedStatus | undefined {
  let statusObject: einsatz_status | undefined;

  if (typeof status === 'string') {
    statusObject = staticStatusList.find((s) =>
      mode === 'helper' ? s.helper_text === status : s.verwalter_text === status
    );
  } else {
    statusObject = status;
  }

  if (!statusObject) {
    console.warn('Unknown status:', status);
    return undefined;
  }

  if (mode === 'helper') {
    return {
      id: statusObject.id,
      text: statusObject.helper_text,
      color: statusObject.helper_color,
    };
  } else if (mode === 'verwaltung') {
    return {
      id: statusObject.id,
      text: statusObject.verwalter_text,
      color: statusObject.verwalter_color,
    };
  }
  throw new Error(
    `Status konnte nicht nach Modus abgerufen werden: Unbekannter Modus: '${mode}'`
  );
}

export const staticStatusList = [
  {
    id: '15512bc7-fc64-4966-961f-c506a084a274',
    helper_color: 'red',
    verwalter_color: 'orange',
    helper_text: 'vergeben',
    verwalter_text: 'vergeben',
  },
  {
    id: '46cee187-d109-4dea-b886-240cf923b8e6',
    helper_color: 'red',
    verwalter_color: 'green',
    helper_text: 'vergeben',
    verwalter_text: 'bestätigt',
  },
  {
    id: 'bb169357-920b-4b49-9e3d-1cf489409370',
    helper_color: 'lime',
    verwalter_color: 'red',
    helper_text: 'offen',
    verwalter_text: 'offen',
  },
] as readonly einsatz_status[];

export function getBadgeColorClassByStatus(
  status: einsatz_status | string,
  mode: CalendarMode
): string {
  let badgeColor: string;
  if (status === 'eigene')
    return 'bg-blue-400 text-blue-900 dark:bg-blue-800 dark:text-blue-200';

  const statusObject = getStatusByMode(status, mode);

  if (mode === 'helper') {
    switch (statusObject?.color) {
      case 'red':
        badgeColor =
          'bg-red-400 text-red-900 dark:bg-red-800 dark:text-red-200';
        break;
      case 'lime':
        badgeColor =
          'bg-lime-400 text-lime-900 dark:bg-lime-800 dark:text-lime-200';
        break;
      default:
        badgeColor =
          'bg-slate-400 text-slate-900 dark:bg-slate-800 dark:text-slate-200';
    }
  } else {
    switch (statusObject?.color) {
      case 'red':
        badgeColor =
          'bg-red-400 text-red-900 dark:bg-red-800 dark:text-red-200';
        break;
      case 'orange':
        badgeColor =
          'bg-orange-400 text-orange-900 dark:bg-orange-800 dark:text-orange-200';
        break;
      case 'green':
        badgeColor =
          'bg-green-400 text-green-900 dark:bg-green-800 dark:text-green-200';
        break;
      default:
        badgeColor =
          'bg-slate-400 text-slate-900 dark:bg-slate-800 dark:text-slate-200';
    }
  }
  return badgeColor;
}

/**
 * Get CSS classes for border radius based on event position in multi-day events
 */
export function getBorderRadiusClasses(
  isFirstDay: boolean,
  isLastDay: boolean
): string {
  if (isFirstDay && isLastDay) {
    return 'rounded'; // Both ends rounded
  } else if (isFirstDay) {
    return 'rounded-l rounded-r-none'; // Only left end rounded
  } else if (isLastDay) {
    return 'rounded-r rounded-l-none'; // Only right end rounded
  } else {
    return 'rounded-none'; // No rounded corners
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
  const validEvents = events.filter((event) => !!event.start);
  if (validEvents.length < events.length) {
    console.warn(
      "Some events are missing the 'start' property and will be skipped:",
      events.filter((event) => !event.start)
    );
  }
  return validEvents
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
