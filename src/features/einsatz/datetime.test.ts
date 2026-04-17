import { describe, expect, it } from 'vitest';

import {
  calendarDateToDbTimestamp,
  dbTimestampToCalendarDate,
  normalizeDateRangeForDb,
  normalizeDateRangeFromDb,
  parseCalendarDateTimeString,
  prismaTimestampToCalendarDate,
} from './datetime';

function createFakeTimestampDate(input: {
  localHour: number;
  utcHour: number;
  minutes?: number;
}): Date {
  const { localHour, utcHour, minutes = 30 } = input;

  return {
    getFullYear: () => 2026,
    getMonth: () => 3,
    getDate: () => 9,
    getHours: () => localHour,
    getMinutes: () => minutes,
    getSeconds: () => 0,
    getMilliseconds: () => 0,
    getUTCFullYear: () => 2026,
    getUTCMonth: () => 3,
    getUTCDate: () => 9,
    getUTCHours: () => utcHour,
    getUTCMinutes: () => minutes,
    getUTCSeconds: () => 0,
    getUTCMilliseconds: () => 0,
  } as unknown as Date;
}

describe('datetime normalization', () => {
  it('keeps local wall-clock components for Prisma values', () => {
    const prismaDate = createFakeTimestampDate({
      localHour: 10,
      utcHour: 8,
      minutes: 15,
    });

    const normalized = prismaTimestampToCalendarDate(prismaDate);

    expect(normalized.getHours()).toBe(10);
    expect(normalized.getMinutes()).toBe(15);
  });

  it('keeps local wall-clock components for realtime/wire values', () => {
    const realtimeDate = createFakeTimestampDate({
      localHour: 12,
      utcHour: 10,
      minutes: 45,
    });

    const normalized = dbTimestampToCalendarDate(realtimeDate);

    expect(normalized.getHours()).toBe(12);
    expect(normalized.getMinutes()).toBe(45);
  });

  it('normalizes Prisma date ranges without UTC subtraction', () => {
    const normalized = normalizeDateRangeFromDb({
      start: createFakeTimestampDate({
        localHour: 9,
        utcHour: 7,
      }),
      end: createFakeTimestampDate({
        localHour: 11,
        utcHour: 9,
      }),
    });

    expect(normalized.start.getHours()).toBe(9);
    expect(normalized.end.getHours()).toBe(11);
  });

  it('parses realtime strings without timezone as local wall-clock time', () => {
    const parsed = parseCalendarDateTimeString('2026-04-09 10:15:00');

    expect(parsed).toBeDefined();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(9);
    expect(parsed?.getHours()).toBe(10);
    expect(parsed?.getMinutes()).toBe(15);
  });

  it('parses realtime strings with microseconds to milliseconds deterministically', () => {
    const parsed = parseCalendarDateTimeString('2026-04-09 10:15:00.123456');

    expect(parsed).toBeDefined();
    expect(parsed?.getHours()).toBe(10);
    expect(parsed?.getMinutes()).toBe(15);
    expect(parsed?.getSeconds()).toBe(0);
    expect(parsed?.getMilliseconds()).toBe(123);
  });

  it('parses timezone wire strings to the same local wall-clock as native Date', () => {
    const input = '2026-04-09T10:15:00.000Z';
    const parsed = parseCalendarDateTimeString(input);
    const expectedOffsetMinutes = -new Date(input).getTimezoneOffset();
    const baseUtcMinutes = 10 * 60 + 15;
    const totalLocalMinutes = baseUtcMinutes + expectedOffsetMinutes;
    const expectedHour =
      ((Math.floor(totalLocalMinutes / 60) % 24) + 24) % 24;
    const expectedMinute = ((totalLocalMinutes % 60) + 60) % 60;

    expect(parsed).toBeDefined();
    expect(parsed?.getHours()).toBe(expectedHour);
    expect(parsed?.getMinutes()).toBe(expectedMinute);
  });

  it('converts calendar instants to Vienna wall-clock for DB writes', () => {
    const calendarDate = new Date('2026-07-01T13:15:00.123Z');

    const dbDate = calendarDateToDbTimestamp(calendarDate);

    expect(dbDate.toISOString()).toBe('2026-07-01T15:15:00.123Z');
  });

  it('normalizes date ranges for DB as Vienna wall-clock timestamps', () => {
    const range = {
      start: new Date('2026-07-01T13:15:00.000Z'),
      end: new Date('2026-07-01T15:15:00.000Z'),
    };

    const normalized = normalizeDateRangeForDb(range);

    expect(normalized.start.toISOString()).toBe('2026-07-01T15:15:00.000Z');
    expect(normalized.end.toISOString()).toBe('2026-07-01T17:15:00.000Z');
  });
});
