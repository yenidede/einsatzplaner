import type { CalendarExportConfig } from './config';

export function composeCalendarExportEventTitle(input: {
  title: string;
  categoryAbbreviations: string[];
  assignedHelpers: number;
  helpersNeeded: number;
  config: CalendarExportConfig;
}) {
  const additions: string[] = [];

  if (input.config.titleAdditions.categories) {
    const categoryText = input.categoryAbbreviations
      .map((category) => category.trim())
      .filter(Boolean)
      .join(', ');

    if (categoryText) {
      additions.push(categoryText);
    }
  }

  if (input.config.titleAdditions.helperCount && input.helpersNeeded > 0) {
    additions.push(`${input.assignedHelpers}/${input.helpersNeeded}`);
  }

  return additions.length > 0
    ? `${input.title} (${additions.join(' · ')})`
    : input.title;
}

export function slugifyCalendarExportFilenamePart(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'kalender';
}
