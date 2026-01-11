// Helper function to apply filter options for number and date fields
export function applyFilterOptions<T>(
  value: T,
  options: 'gte' | 'lte' | 'equals'
): T | { gte: T } | { lte: T } {
  switch (options) {
    case 'gte':
      return { gte: value };
    case 'lte':
      return { lte: value };
    case 'equals':
      return value;
  }
}

export function filterByOption<T>(
  existingValue: T,
  filterByValue: T,
  options: 'gte' | 'lte' | 'equals' | undefined
): boolean {
  switch (options) {
    case 'gte':
      return filterByValue >= existingValue;
    case 'lte':
      return filterByValue <= existingValue;
    default:
      return filterByValue === existingValue;
  }
}
