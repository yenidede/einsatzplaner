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
