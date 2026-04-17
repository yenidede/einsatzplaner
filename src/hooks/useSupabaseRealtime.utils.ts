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

  const normalizedCategoryAbbreviations = (categoryAbbreviations ?? []).filter(
    (abbreviation) => abbreviation.trim().length > 0
  );

  if (normalizedCategoryAbbreviations.length > 0) {
    return `${nextBaseTitle} (${normalizedCategoryAbbreviations.join(', ')})`;
  }

  const existingSuffix = extractTrailingParenthesisSuffix(existingTitle);
  if (existingSuffix) {
    return `${nextBaseTitle} (${existingSuffix})`;
  }

  return nextBaseTitle;
}
