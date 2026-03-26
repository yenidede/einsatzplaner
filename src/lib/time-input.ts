/**
 * Checks whether a string is a normalized time in `HH:MM` 24-hour format.
 *
 * @param value - The string to validate as a time.
 * @returns `true` if `value` is in `HH:MM` with hours `00`–`23` and minutes `00`–`59`, `false` otherwise.
 */
export function isNormalizedTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

/**
 * Format hours and minutes as a zero-padded "HH:MM" string.
 *
 * @param hours - Hour component (0–23)
 * @param minutes - Minute component (0–59)
 * @returns The time formatted as `HH:MM` with leading zeros when necessary
 */
function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Checks whether numeric hour and minute values represent a valid 24-hour time.
 *
 * @param hours - Hour component to validate.
 * @param minutes - Minute component to validate.
 * @returns `true` if `hours` is an integer from 0 to 23 and `minutes` is an integer from 0 to 59, `false` otherwise.
 */
function isValidTime(hours: number, minutes: number): boolean {
  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

/**
 * Normalize a user-entered time string to a zero-padded `HH:MM` format.
 *
 * Accepts inputs with `:` or `.` separators, or digit-only strings (1–4 digits).
 * Leading/trailing whitespace is ignored; an all-whitespace input yields an empty string.
 *
 * @param value - The raw input string to normalize (e.g., `"9:5"`, `"09.05"`, `"930"`, `"9"`, or `"  "`).
 * @returns The normalized time as `HH:MM` when the input represents a valid 24-hour time, `''` if the input was empty/whitespace, or `null` if the input cannot be interpreted as a valid time.
 */
export function normalizeTimeInput(value: string): string | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return '';
  }

  const normalizedSeparators = trimmedValue.replace('.', ':');
  const separatedMatch = normalizedSeparators.match(/^(\d{1,2}):(\d{1,2})$/);

  if (separatedMatch) {
    const hours = Number(separatedMatch[1]);
    const minutes = Number(separatedMatch[2]);

    if (!isValidTime(hours, minutes)) {
      return null;
    }

    return formatTime(hours, minutes);
  }

  if (!/^\d{1,4}$/.test(trimmedValue)) {
    return null;
  }

  if (trimmedValue.length <= 2) {
    const hours = Number(trimmedValue);
    if (!isValidTime(hours, 0)) {
      return null;
    }

    return formatTime(hours, 0);
  }

  const hourDigits = trimmedValue.length === 3 ? 1 : 2;
  const hours = Number(trimmedValue.slice(0, hourDigits));
  const minutes = Number(trimmedValue.slice(hourDigits));

  if (!isValidTime(hours, minutes)) {
    return null;
  }

  return formatTime(hours, minutes);
}

/**
 * Convert a Date to a zero-padded `HH:MM` time string suitable for time inputs.
 *
 * @param date - The Date to format; may be `null` or `undefined`. If `date` is `null`, `undefined`, or represents an invalid time (`NaN`), the function returns an empty string.
 * @returns The formatted `HH:MM` string using the date's hours and minutes, or `''` when `date` is null, undefined, or invalid.
 */
export function formatDateToTimeInput(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  return formatTime(date.getHours(), date.getMinutes());
}

/**
 * Converts a `HH:MM` time string into a Date derived from a base date.
 *
 * If `value` is a valid `HH:MM` string, returns a new Date with the same year/month/day as `baseDate`
 * and hours/minutes set from `value`; seconds and milliseconds are set to `0`. If `value` is not a valid
 * `HH:MM` string, returns `null`.
 *
 * @param value - Time in `HH:MM` 24-hour format
 * @param baseDate - Date whose year, month, and day are used for the result (defaults to 2000-01-01)
 * @returns A Date with hours and minutes set from `value`, or `null` if `value` is not normalized
 */
export function parseNormalizedTimeToDate(
  value: string,
  baseDate: Date = new Date(2000, 0, 1)
): Date | null {
  if (!isNormalizedTime(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
