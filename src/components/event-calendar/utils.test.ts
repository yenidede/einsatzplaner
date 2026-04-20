/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { isMultiDayEvent, spansMultipleDays } from './utils';
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
