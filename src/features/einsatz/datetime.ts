import type {
  einsatz as Einsatz,
  organization as Organization,
} from '@/generated/prisma';

type DateRange = {
  start: Date;
  end: Date;
};

type TimeDefaultRange = Pick<
  Organization,
  'default_starttime' | 'default_endtime'
>;

type CalendarDateValue = Date | string | null | undefined;

/**
 * Realtime / wire payloads expose these calendar timestamps as UTC-like instants while the
 * column type is "timestamp without time zone". For calendar UX we treat them as floating
 * local wall-clock values and convert explicitly at the application boundary.
 */
export function dbTimestampToCalendarDate(value: Date): Date {
  return new Date(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds()
  );
}

export function parseCalendarDateTimeString(
  value: string | null | undefined
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const timestampWithoutTimezoneMatch =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(
      value
    );

  if (timestampWithoutTimezoneMatch) {
    const [, year, month, day, hours, minutes, seconds, milliseconds] =
      timestampWithoutTimezoneMatch;
    const normalizedMilliseconds = Number(
      (milliseconds ?? '0').slice(0, 3).padEnd(3, '0')
    );

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? 0),
      normalizedMilliseconds
    );
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime())
    ? undefined
    : dbTimestampToCalendarDate(parsedDate);
}

export function normalizeCalendarDateValue(
  value: CalendarDateValue
): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return prismaTimestampToCalendarDate(value);
  }

  return parseCalendarDateTimeString(value);
}

/**
 * Prisma already materializes "timestamp without time zone" values as local wall-clock Dates.
 * Preserve those local components instead of reinterpreting them through UTC getters.
 */
export function prismaTimestampToCalendarDate(value: Date): Date {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds()
  );
}

export function calendarDateToDbTimestamp(value: Date): Date {
  return new Date(
    Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds()
    )
  );
}

export function normalizeDateRangeFromDb<T extends DateRange>(value: T): T {
  return {
    ...value,
    start: prismaTimestampToCalendarDate(value.start),
    end: prismaTimestampToCalendarDate(value.end),
  };
}

export function normalizeDateRangeForDb<T extends DateRange>(value: T): T {
  return {
    ...value,
    start: calendarDateToDbTimestamp(value.start),
    end: calendarDateToDbTimestamp(value.end),
  };
}

export function normalizeEinsatzDatesFromDb<T extends Pick<Einsatz, 'start' | 'end'>>(
  value: T
): T {
  return normalizeDateRangeFromDb(value);
}

export function normalizeOrganizationTimeDefaultsFromDb<T extends TimeDefaultRange>(
  value: T
): T {
  return {
    ...value,
    default_starttime: prismaTimestampToCalendarDate(value.default_starttime),
    default_endtime: prismaTimestampToCalendarDate(value.default_endtime),
  };
}
