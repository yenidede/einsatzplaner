import { startOfDay, subMonths } from 'date-fns';
import type { CalendarExportConfig } from './config';

export type CalendarExportFilterEvent = {
  id: string;
  start: Date;
  end: Date;
  all_day: boolean;
  status_id: string;
  einsatz_to_category: Array<{
    category_id?: string;
    einsatz_category?: {
      id?: string;
      abbreviation?: string;
    };
  }>;
  einsatz_helper: Array<{
    user_id?: string;
    user?: {
      id?: string;
      firstname?: string;
    };
  }>;
};

export type CalendarExportSizeGuardResult<T> = {
  events: T[];
  trimmedBefore: Date | null;
};

function parseTimeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function getDailySegments(from: number, to: number): Array<[number, number]> {
  if (from === to) {
    return [[0, 1440]];
  }

  if (from < to) {
    return [[from, to]];
  }

  return [
    [from, 1440],
    [0, to],
  ];
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number
) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function eventOverlapsTimeWindow(
  event: CalendarExportFilterEvent,
  config: CalendarExportConfig
) {
  if (event.all_day) {
    return config.includeAllDay;
  }

  if (!config.timeWindow) {
    return true;
  }

  const durationMs = event.end.getTime() - event.start.getTime();
  if (durationMs >= 24 * 60 * 60 * 1000) {
    return true;
  }

  const eventStart = event.start.getHours() * 60 + event.start.getMinutes();
  const rawEventEnd = event.end.getHours() * 60 + event.end.getMinutes();
  const eventEnd = rawEventEnd === eventStart ? eventStart + 1 : rawEventEnd;
  const eventSegments =
    eventStart < eventEnd
      ? ([[eventStart, eventEnd]] satisfies Array<[number, number]>)
      : ([
          [eventStart, 1440],
          [0, eventEnd],
        ] satisfies Array<[number, number]>);

  const filterSegments = getDailySegments(
    parseTimeToMinutes(config.timeWindow.from),
    parseTimeToMinutes(config.timeWindow.to)
  );

  return eventSegments.some(([eventSegmentStart, eventSegmentEnd]) =>
    filterSegments.some(([filterSegmentStart, filterSegmentEnd]) =>
      rangesOverlap(
        eventSegmentStart,
        eventSegmentEnd,
        filterSegmentStart,
        filterSegmentEnd
      )
    )
  );
}

function eventMatchesCategories(
  event: CalendarExportFilterEvent,
  config: CalendarExportConfig
) {
  if (config.categoryIds.length === 0) {
    return true;
  }

  const selectedCategoryIds = new Set(config.categoryIds);
  return event.einsatz_to_category.some((category) => {
    const categoryId = category.category_id ?? category.einsatz_category?.id;
    return categoryId ? selectedCategoryIds.has(categoryId) : false;
  });
}

function eventMatchesStatus(
  event: CalendarExportFilterEvent,
  config: CalendarExportConfig,
  ownerUserId: string
) {
  if (config.statusIds.length === 0 && config.statusPseudo.length === 0) {
    return true;
  }

  if (config.statusIds.includes(event.status_id)) {
    return true;
  }

  if (config.mode === 'helper' && config.statusPseudo.includes('own')) {
    return event.einsatz_helper.some((helper) => {
      const helperUserId = helper.user_id ?? helper.user?.id;
      return helperUserId === ownerUserId;
    });
  }

  return false;
}

function eventMatchesFutureOnly(
  event: CalendarExportFilterEvent,
  config: CalendarExportConfig,
  now: Date
) {
  if (!config.futureOnly) {
    return true;
  }

  return event.end >= startOfDay(now);
}

export function eventMatchesCalendarExportConfig(
  event: CalendarExportFilterEvent,
  config: CalendarExportConfig,
  ownerUserId: string,
  now: Date = new Date()
) {
  return (
    eventMatchesCategories(event, config) &&
    eventMatchesStatus(event, config, ownerUserId) &&
    eventOverlapsTimeWindow(event, config) &&
    eventMatchesFutureOnly(event, config, now)
  );
}

export function applyCalendarExportSizeGuard<T extends { end: Date }>(
  events: T[],
  now: Date = new Date()
): CalendarExportSizeGuardResult<T> {
  if (events.length <= 500) {
    return { events, trimmedBefore: null };
  }

  const minimumPastDate = startOfDay(subMonths(now, 1));
  const guardedEvents = events.filter((event) => event.end >= minimumPastDate);

  if (guardedEvents.length === events.length) {
    return { events, trimmedBefore: null };
  }

  return {
    events: guardedEvents,
    trimmedBefore: minimumPastDate,
  };
}

export function filterCalendarExportEvents<T extends CalendarExportFilterEvent>(
  events: T[],
  config: CalendarExportConfig,
  ownerUserId: string,
  now: Date = new Date()
): CalendarExportSizeGuardResult<T> {
  const matchingEvents = events.filter((event) =>
    eventMatchesCalendarExportConfig(event, config, ownerUserId, now)
  );

  return applyCalendarExportSizeGuard(matchingEvents, now);
}
