function extractTrailingParenthesisSuffix(
  value: string | undefined
): string | null {
  if (!value) {
    return null;
  }

  const match = /\s\(([^()]+)\)$/.exec(value);
  return match?.[1] ?? null;
}

function stripTrailingParenthesisSuffix(value: string): string {
  return value.replace(/\s\(([^()]+)\)$/, '');
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
  const existingSuffix = extractTrailingParenthesisSuffix(existingTitle);
  const nextBaseTitleSuffix = extractTrailingParenthesisSuffix(nextBaseTitle);
  const normalizedBaseTitle =
    existingSuffix && nextBaseTitleSuffix === existingSuffix
      ? stripTrailingParenthesisSuffix(nextBaseTitle)
      : nextBaseTitle;

  if (categoryAbbreviations === null || categoryAbbreviations === undefined) {
    if (existingSuffix) {
      return `${normalizedBaseTitle} (${existingSuffix})`;
    }
    return normalizedBaseTitle;
  }

  if (categoryAbbreviations.length > 0 && normalizedCategoryAbbreviations.length > 0) {
    return `${normalizedBaseTitle} (${normalizedCategoryAbbreviations.join(', ')})`;
  }

  return normalizedBaseTitle;
}

export function parseSupabaseRealtimeTimestamp(
  value: string | null | undefined
): Date | undefined {
  if (!value) {
    return undefined;
  }

  // `timestamp without time zone` should always be interpreted as wall-clock time.
  // Some realtime payloads may still include a zone suffix (`Z` / `+02:00`);
  // we intentionally ignore that suffix to avoid ±offset drift in the UI.
  const timestampMatch =
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(?:Z|[+\-]\d{2}:?\d{2})?$/.exec(
      value
    );

  if (timestampMatch) {
    const [, year, month, day, hours, minutes, seconds, milliseconds] =
      timestampMatch;
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
