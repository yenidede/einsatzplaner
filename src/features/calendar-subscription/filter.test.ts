import { describe, expect, it } from 'vitest';
import {
  filterCalendarExportEvents,
  eventMatchesCalendarExportConfig,
} from './filter';
import {
  defaultCalendarExportConfig,
  type CalendarExportConfig,
} from './config';

function config(
  overrides: Partial<CalendarExportConfig>
): CalendarExportConfig {
  return {
    ...defaultCalendarExportConfig,
    ...overrides,
    titleAdditions: {
      ...defaultCalendarExportConfig.titleAdditions,
      ...overrides.titleAdditions,
    },
  };
}

function event(overrides: {
  id?: string;
  start?: Date;
  end?: Date;
  all_day?: boolean;
  status_id?: string;
  categoryIds?: string[];
  helperUserIds?: string[];
}) {
  return {
    id: overrides.id ?? 'event-1',
    start: overrides.start ?? new Date(2026, 5, 4, 16, 0),
    end: overrides.end ?? new Date(2026, 5, 4, 18, 0),
    all_day: overrides.all_day ?? false,
    status_id: overrides.status_id ?? 'status-open',
    einsatz_to_category: (overrides.categoryIds ?? []).map((categoryId) => ({
      category_id: categoryId,
    })),
    einsatz_helper: (overrides.helperUserIds ?? []).map((userId) => ({
      user_id: userId,
    })),
  };
}

describe('calendar export filter', () => {
  it('treats selected categories as OR and empty categories as no filter', () => {
    const exportConfig = config({ categoryIds: ['cat-a', 'cat-b'] });

    expect(
      eventMatchesCalendarExportConfig(
        event({ categoryIds: ['cat-b'] }),
        exportConfig,
        'user-1'
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        event({ categoryIds: ['cat-c'] }),
        exportConfig,
        'user-1'
      )
    ).toBe(false);
    expect(
      eventMatchesCalendarExportConfig(
        event({ categoryIds: [] }),
        config({ categoryIds: [] }),
        'user-1'
      )
    ).toBe(true);
  });

  it('matches real statuses and eigene as OR branches', () => {
    const exportConfig = config({
      mode: 'helper',
      statusIds: ['status-open'],
      statusPseudo: ['own'],
    });

    expect(
      eventMatchesCalendarExportConfig(
        event({ status_id: 'status-open' }),
        exportConfig,
        'user-1'
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        event({ status_id: 'status-assigned', helperUserIds: ['user-1'] }),
        exportConfig,
        'user-1'
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        event({ status_id: 'status-assigned', helperUserIds: ['user-2'] }),
        exportConfig,
        'user-1'
      )
    ).toBe(false);
  });

  it('matches timed events that overlap a same-day time window', () => {
    const exportConfig = config({
      timeWindow: { from: '16:00', to: '20:00' },
    });

    expect(
      eventMatchesCalendarExportConfig(
        event({
          start: new Date(2026, 5, 4, 15, 0),
          end: new Date(2026, 5, 4, 17, 0),
        }),
        exportConfig,
        'user-1'
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        event({
          start: new Date(2026, 5, 4, 14, 0),
          end: new Date(2026, 5, 4, 15, 0),
        }),
        exportConfig,
        'user-1'
      )
    ).toBe(false);
  });

  it('matches overnight time windows', () => {
    const exportConfig = config({
      timeWindow: { from: '22:00', to: '02:00' },
    });

    expect(
      eventMatchesCalendarExportConfig(
        event({
          start: new Date(2026, 5, 4, 23, 0),
          end: new Date(2026, 5, 4, 23, 30),
        }),
        exportConfig,
        'user-1'
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        event({
          start: new Date(2026, 5, 4, 12, 0),
          end: new Date(2026, 5, 4, 13, 0),
        }),
        exportConfig,
        'user-1'
      )
    ).toBe(false);
  });

  it('includes all-day events only when configured', () => {
    const allDayEvent = event({ all_day: true });

    expect(
      eventMatchesCalendarExportConfig(
        allDayEvent,
        config({
          timeWindow: { from: '16:00', to: '20:00' },
          includeAllDay: true,
        }),
        'user-1'
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        allDayEvent,
        config({
          timeWindow: { from: '16:00', to: '20:00' },
          includeAllDay: false,
        }),
        'user-1'
      )
    ).toBe(false);
  });

  it('uses event end for future-only filtering', () => {
    const now = new Date(2026, 5, 4, 10, 0);
    const exportConfig = config({ futureOnly: true });

    expect(
      eventMatchesCalendarExportConfig(
        event({
          start: new Date(2026, 5, 3, 20, 0),
          end: new Date(2026, 5, 4, 1, 0),
        }),
        exportConfig,
        'user-1',
        now
      )
    ).toBe(true);
    expect(
      eventMatchesCalendarExportConfig(
        event({
          start: new Date(2026, 5, 2, 20, 0),
          end: new Date(2026, 5, 3, 23, 0),
        }),
        exportConfig,
        'user-1',
        now
      )
    ).toBe(false);
  });

  it('trims old past events only when there are more than 500 matches', () => {
    const now = new Date(2026, 5, 4, 12, 0);
    const oldEvents = Array.from({ length: 300 }, (_, index) =>
      event({
        id: `old-${index}`,
        start: new Date(2026, 3, 1, 10, 0),
        end: new Date(2026, 3, 1, 11, 0),
      })
    );
    const recentEvents = Array.from({ length: 250 }, (_, index) =>
      event({
        id: `recent-${index}`,
        start: new Date(2026, 4, 20, 10, 0),
        end: new Date(2026, 4, 20, 11, 0),
      })
    );

    const result = filterCalendarExportEvents(
      [...oldEvents, ...recentEvents],
      defaultCalendarExportConfig,
      'user-1',
      now
    );

    expect(result.events).toHaveLength(250);
    expect(result.trimmedBefore).toEqual(new Date(2026, 4, 4));
  });
});
