import type { CalendarExportConfig } from './config';

export function composeCalendarExportEventTitle(input: {
  title: string;
  categoryAbbreviations: string[];
  assignedHelperFirstNames: string[];
  assignedHelpers: number;
  helpersNeeded: number;
  config: CalendarExportConfig;
}) {
  const titleParts: string[] = [];
  const additions: string[] = [];

  if (input.config.titleAdditions.assignedHelperNames) {
    const helperNames = input.assignedHelperFirstNames
      .map((name) => name.trim())
      .filter(Boolean);
    const openPositions = Math.max(input.helpersNeeded - helperNames.length, 0);
    if (helperNames.length > 0) {
      const helperNameText =
        openPositions > 0
          ? `${helperNames.join(', ')} + ${openPositions}`
          : helperNames.join(', ');
      titleParts.push(helperNameText);
    }
  }

  if (input.config.titleAdditions.eventTitle) {
    titleParts.push(input.title);
  }

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

  const baseTitle = titleParts.join(' | ');
  if (baseTitle && additions.length > 0) {
    return `${baseTitle} (${additions.join(' · ')})`;
  }

  if (baseTitle) {
    return baseTitle;
  }

  if (additions.length > 0) {
    return additions.join(' · ');
  }

  return input.title;
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
