export function isNormalizedTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

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

export function formatDateToTimeInput(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }

  return formatTime(date.getHours(), date.getMinutes());
}

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
