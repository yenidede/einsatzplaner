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

const ORGANIZATION_TIME_ZONE = 'Europe/Vienna';
const VIENNA_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: ORGANIZATION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
});

/**
 * Realtime / wire timestamps are parsed by the runtime into local Date instances.
 * For calendar UX we keep those local wall-clock components unchanged.
 */
function toCalendarDate(value: Date): Date {
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

export function dbTimestampToCalendarDate(value: Date): Date {
  return toCalendarDate(value);
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

/**
 * Prisma already materializes "timestamp without time zone" values as local wall-clock Dates.
 * Preserve those local components instead of reinterpreting them through UTC getters.
 */
export function prismaTimestampToCalendarDate(value: Date): Date {
  return toCalendarDate(value);
}

export function calendarDateToDbTimestamp(value: Date): Date {
  // Server Actions serialize Date values as instants.
  // For "timestamp without time zone" columns we must persist wall-clock values
  // in the org timezone independent of server timezone.
  const parts = VIENNA_TIMESTAMP_FORMATTER.formatToParts(value);

  const readPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((entry) => entry.type === type);
    return Number(part?.value ?? '0');
  };

  return new Date(
    Date.UTC(
      readPart('year'),
      readPart('month') - 1,
      readPart('day'),
      readPart('hour'),
      readPart('minute'),
      readPart('second'),
      readPart('fractionalSecond')
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
