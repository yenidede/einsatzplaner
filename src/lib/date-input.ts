import { format, isValid, parse } from 'date-fns';
import { de } from 'date-fns/locale';

const DISPLAY_FORMAT = 'd. MMMM yyyy';
const ISO_FORMAT = 'yyyy-MM-dd';

export type DateInputRangeTextValue = {
  from: string;
  to: string;
} | null;

function createDateOrNull(
  year: number,
  month: number,
  day: number
): Date | null {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseNumericDateParts(value: string): Date | null {
  const shortCompactMatch = /^(\d{2})(\d{2})$/.exec(value);
  if (shortCompactMatch) {
    const [, day, month] = shortCompactMatch;
    return createDateOrNull(new Date().getFullYear(), Number(month), Number(day));
  }

  const compactMatch = /^(\d{2})(\d{2})(\d{2}|\d{4})$/.exec(value);
  if (compactMatch) {
    const [, day, month, yearPart] = compactMatch;
    const year =
      yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
    return createDateOrNull(year, Number(month), Number(day));
  }

  const separatedMatch = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(
    value
  );
  if (separatedMatch) {
    const [, day, month, yearPart] = separatedMatch;
    const year =
      yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
    return createDateOrNull(year, Number(month), Number(day));
  }

  return null;
}

function parseGermanLongDate(value: string): Date | null {
  const formats = ['d. MMMM yyyy', 'd MMMM yyyy'];

  for (const dateFormat of formats) {
    const parsed = parse(value, dateFormat, new Date(), { locale: de });
    if (isValid(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function parseDateInputText(value: string): Date | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return null;
  }

  if (/^\d{8}$/.test(trimmedValue) || /^\d{6}$/.test(trimmedValue)) {
    return parseNumericDateParts(trimmedValue);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    const parsed = parse(trimmedValue, ISO_FORMAT, new Date());
    return isValid(parsed) ? parsed : null;
  }

  return parseNumericDateParts(trimmedValue) ?? parseGermanLongDate(trimmedValue);
}

export function parseDateRangeInputText(
  value: string
): { from: Date; to: Date } | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return null;
  }

  const normalizedRangeValue = trimmedValue.replace(/[–—]/g, '-');

  for (let index = 0; index < normalizedRangeValue.length; index += 1) {
    if (normalizedRangeValue[index] !== '-') {
      continue;
    }

    const from = parseDateInputText(normalizedRangeValue.slice(0, index));
    const to = parseDateInputText(normalizedRangeValue.slice(index + 1));

    if (from && to) {
      return { from, to };
    }
  }

  const singleDate = parseDateInputText(trimmedValue);

  if (singleDate) {
    return { from: singleDate, to: singleDate };
  }

  return null;
}

export function formatDateInputDisplay(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) {
    return '';
  }

  return format(value, DISPLAY_FORMAT, { locale: de });
}

export function formatDateInputValue(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) {
    return '';
  }

  return format(value, ISO_FORMAT);
}
