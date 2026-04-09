import { describe, expect, it } from 'vitest';

import {
  dbTimestampToCalendarDate,
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
  it('behält bei Prisma-Daten die lokalen Wandzeit-Komponenten bei', () => {
    const prismaDate = createFakeTimestampDate({
      localHour: 10,
      utcHour: 8,
      minutes: 15,
    });

    const normalized = prismaTimestampToCalendarDate(prismaDate);

    expect(normalized.getHours()).toBe(10);
    expect(normalized.getMinutes()).toBe(15);
  });

  it('interpretiert Realtime-/Wire-Daten weiterhin über UTC-Komponenten', () => {
    const realtimeDate = createFakeTimestampDate({
      localHour: 12,
      utcHour: 10,
      minutes: 45,
    });

    const normalized = dbTimestampToCalendarDate(realtimeDate);

    expect(normalized.getHours()).toBe(10);
    expect(normalized.getMinutes()).toBe(45);
  });

  it('normalisiert gelesene Einsatz-Zeiträume aus Prisma ohne UTC-Abzug', () => {
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

  it('parst Realtime-Strings ohne Zeitzone als lokale Wandzeit', () => {
    const parsed = parseCalendarDateTimeString('2026-04-09 10:15:00');

    expect(parsed).toBeDefined();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(9);
    expect(parsed?.getHours()).toBe(10);
    expect(parsed?.getMinutes()).toBe(15);
  });

  it('parst Wire-Strings mit Zeitzone weiter über UTC-Komponenten', () => {
    const parsed = parseCalendarDateTimeString('2026-04-09T10:15:00.000Z');

    expect(parsed).toBeDefined();
    expect(parsed?.getHours()).toBe(10);
    expect(parsed?.getMinutes()).toBe(15);
  });
});
