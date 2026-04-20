/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { generateDynamicSchema, isMultiDayEvent, spansMultipleDays } from './utils';
import type { CalendarEvent } from './types';

describe('event calendar multi-day helpers', () => {
  it('erkennt Spannen über Monatsgrenzen als mehrtägig', () => {
    const event = {
      id: 'cross-month',
      title: 'Monatswechsel',
      start: new Date(2026, 3, 1, 8, 0, 0),
      end: new Date(2026, 4, 1, 9, 0, 0),
      assignedUsers: [],
      helpersNeeded: 0,
    } satisfies CalendarEvent;

    expect(spansMultipleDays(event)).toBe(true);
    expect(isMultiDayEvent(event)).toBe(true);
  });

  it('behandelt ganztägige Ein-Tages-Einsätze nicht als Spanne', () => {
    const event = {
      id: 'single-all-day',
      title: 'Ganztägig',
      start: new Date(2026, 3, 20, 0, 0, 0),
      end: new Date(2026, 3, 20, 23, 59, 59),
      allDay: true,
      assignedUsers: [],
      helpersNeeded: 0,
    } satisfies CalendarEvent;

    expect(spansMultipleDays(event)).toBe(false);
    expect(isMultiDayEvent(event)).toBe(true);
  });
});

describe('generateDynamicSchema', () => {
  it('unterstützt date/time Felder für Pflichtangaben', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'd1',
        type: 'date',
        options: { isRequired: true },
      },
      {
        fieldId: 't1',
        type: 'time',
        options: { isRequired: true },
      },
    ]);

    const parsed = schema.parse({
      d1: '2026-04-20',
      t1: '13:45',
    });

    expect(parsed).toEqual({
      d1: '2026-04-20',
      t1: '13:45',
    });
  });

  it('lehnt ungültige date/time Werte ab', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'd1',
        type: 'date',
        options: { isRequired: true },
      },
      {
        fieldId: 't1',
        type: 'time',
        options: { isRequired: true },
      },
    ]);

    const result = schema.safeParse({
      d1: '20-04-2026',
      t1: '25:61',
    });

    expect(result.success).toBe(false);
  });

  it('ignoriert group-Felder in der Schemaerzeugung', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'g1',
        type: 'group',
        options: {},
      },
      {
        fieldId: 'txt1',
        type: 'text',
        options: { isRequired: false },
      },
    ]);

    const parsed = schema.parse({
      txt1: 'Wert',
    });

    expect(parsed).toEqual({
      txt1: 'Wert',
    });
  });
});
