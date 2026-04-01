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

/**
 * Prisma/Postgres currently expose these calendar timestamps as UTC instants while the
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
    start: dbTimestampToCalendarDate(value.start),
    end: dbTimestampToCalendarDate(value.end),
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
    default_starttime: dbTimestampToCalendarDate(value.default_starttime),
    default_endtime: dbTimestampToCalendarDate(value.default_endtime),
  };
}
