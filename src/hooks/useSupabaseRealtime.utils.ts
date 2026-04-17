function extractTrailingParenthesisSuffix(
  value: string | undefined
): string | null {
  if (!value) {
    return null;
  }

  const match = /\s\(([^()]+)\)$/.exec(value);
  return match?.[1] ?? null;
}

export function composeRealtimeEventTitle(params: {
  existingTitle: string;
  nextBaseTitle?: string;
  categoryAbbreviations?: string[] | null;
}): string {
  const { existingTitle, nextBaseTitle, categoryAbbreviations } = params;

  if (nextBaseTitle === undefined) {
    return existingTitle;
  }

  if (nextBaseTitle === '') {
    return '';
  }

  const normalizedCategoryAbbreviations = (categoryAbbreviations ?? []).filter(
    (abbreviation) => abbreviation.trim().length > 0
  );

  if (categoryAbbreviations === null || categoryAbbreviations === undefined) {
    const existingSuffix = extractTrailingParenthesisSuffix(existingTitle);
    if (existingSuffix) {
      return `${nextBaseTitle} (${existingSuffix})`;
    }
    return nextBaseTitle;
  }

  if (categoryAbbreviations.length > 0 && normalizedCategoryAbbreviations.length > 0) {
    return `${nextBaseTitle} (${normalizedCategoryAbbreviations.join(', ')})`;
  }

  return nextBaseTitle;
}

export function parseSupabaseRealtimeTimestamp(
  value: string | null | undefined
): Date | undefined {
  if (!value) {
    return undefined;
  }

  // `timestamp without time zone` must be interpreted as local wall-clock time.
  // Do not coerce to UTC by appending "Z".
  const timestampWithoutTimezoneMatch =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(
      value
    );

  if (timestampWithoutTimezoneMatch) {
    const [, year, month, day, hours, minutes, seconds, milliseconds] =
      timestampWithoutTimezoneMatch;
    const normalizedMilliseconds = (milliseconds ?? '0')
      .slice(0, 3)
      .padEnd(3, '0');

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? 0),
      Number(normalizedMilliseconds)
    );
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}
