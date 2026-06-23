export function parseMultiSelectValue(
  value: string | null | undefined
): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function serializeMultiSelectValue(values: readonly string[]): string {
  return values.join(',');
}

export function getUnavailableSelectValues(
  values: readonly string[],
  allowedValues: readonly string[]
): string[] {
  const allowedValueSet = new Set(allowedValues);
  return values.filter((value) => !allowedValueSet.has(value));
}
