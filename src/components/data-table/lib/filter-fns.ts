// filterFns.ts
import { FilterFn, Row } from '@tanstack/react-table';
import type { Operators } from '../config/data-table';
import type { EinsatzListItem } from '@/features/einsatz/types';
import { FilterItemSchema } from './parsers';
import { get } from 'lodash';

// ----- Types for Advanced Toolbar filter value -----

export type JoinOp = 'and' | 'or';

export type Clause = {
  value?: unknown;
  operator?: Operators;
};

// ----- Helpers -----

const toLower = (v: unknown) => (v == null ? '' : String(v).toLowerCase());

const isBlank = (v: unknown) => v == null || v === '' || v === '-';

const asNumber = (v: unknown) => (typeof v === 'number' ? v : Number(v));

function isNumericLike(v: unknown): boolean {
  if (typeof v === 'number') {
    return Number.isFinite(v);
  }

  if (typeof v !== 'string') {
    return false;
  }

  const normalizedValue = v.trim().replace(',', '.');

  if (normalizedValue === '') {
    return false;
  }

  return Number.isFinite(Number(normalizedValue));
}

type asDateOnlyFnProps = {
  filterValue: string | number | Date;
  cellValue: unknown;
};

/**
 * Convert a date-like value into a `Date`, or return `null` for invalid input.
 *
 * `Date` inputs are normalized to midnight of the same calendar day. Numeric and
 * digit-only string inputs are interpreted as epoch milliseconds and returned as
 * constructed by `new Date(...)`.
 *
 * @param timestamp - A `Date`, a numeric epoch timestamp in milliseconds, or a digit-only string representing epoch milliseconds
 * @returns A `Date` for valid inputs, or `null` if the input cannot be parsed into a valid date
 */
function timestampToDate(timestamp: number | string | Date): Date | null {
  if (timestamp instanceof Date)
    return new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate()
    );
  else {
    // Convert input to number if it's a string
    const ts =
      typeof timestamp === 'number'
        ? timestamp
        : typeof timestamp === 'string'
          ? /^\d+$/.test(timestamp.trim())
            ? Number(timestamp)
            : NaN
          : NaN;

    // Check if timestamp is a valid number
    if (isNaN(ts)) return null;

    const date = new Date(ts);

    // Check if date is valid
    if (isNaN(date.getTime())) return null;

    return date;
  }
}

/**
 * Type guard that determines whether a value is a date-like filter input.
 *
 * @param value - The value to test
 * @returns `true` if `value` is a `string`, `number`, or `Date`, `false` otherwise.
 */
function isDateFilterValue(value: unknown): value is string | number | Date {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    value instanceof Date
  );
}

/**
 * Prepare filter and cell inputs for date comparisons.
 *
 * The filter value is converted via `timestampToDate`. The cell value is
 * normalized to midnight only when it is already a `Date`.
 *
 * @param filterValue - A timestamp-like value used as the filter input
 * @param cellValue - The row cell value to compare against the filter input
 * @returns An array where index `0` holds the converted filter value and index `1` holds the normalized cell date when available
 */
function asDateOnlys({ filterValue, cellValue }: asDateOnlyFnProps): Date[] {
  const result: Date[] = [];

  const fvDate = timestampToDate(filterValue);
  if (fvDate) result[0] = fvDate;

  if (cellValue instanceof Date)
    result[1] = new Date(
      cellValue.getFullYear(),
      cellValue.getMonth(),
      cellValue.getDate()
    );

  return result;
}

/**
 * Determines whether two Date objects fall on the same calendar day.
 *
 * @param fv - The first date to compare
 * @param cv - The second date to compare
 * @returns `true` if `fv` and `cv` have the same year, month, and day, `false` otherwise
 */
function isDateSameDay(fv: Date, cv: Date): boolean {
  return (
    fv.getFullYear() === cv.getFullYear() &&
    fv.getMonth() === cv.getMonth() &&
    fv.getDate() === cv.getDate()
  );
}

/**
 * Evaluate a single filter clause against a cell value.
 *
 * Returns whether the provided cell value satisfies the clause's operator and value.
 * If the clause has no operator or an unrecognized operator, the function treats the clause as not fully set and returns `true`.
 *
 * @param cellValue - The value from the row cell to evaluate.
 * @param clause - Filter clause containing an `operator` and associated `value` used for evaluation.
 * @returns `true` if the cell value matches the clause, `false` otherwise.
 */
function evalClause(cellValue: unknown, clause: Clause): boolean {
  if (!clause?.operator) return true; // No operator means filter not fully set. Show all.
  const { operator, value } = clause;

  switch (operator) {
    // Text (case-insensitive)
    case 'iLike': {
      return toLower(cellValue).includes(toLower(value));
    }
    case 'notILike': {
      return !toLower(cellValue).includes(toLower(value));
    }

    // Equality / inequality (works for text/number/boolean/select)
    case 'eq': {
      if (isNumericLike(cellValue) && isNumericLike(value)) {
        return asNumber(
          typeof cellValue === 'string'
            ? cellValue.replace(',', '.')
            : cellValue
        ) ===
          asNumber(
            typeof value === 'string' ? value.replace(',', '.') : value
          );
      }

      return cellValue === value;
    }
    case 'ne': {
      if (isNumericLike(cellValue) && isNumericLike(value)) {
        return asNumber(
          typeof cellValue === 'string'
            ? cellValue.replace(',', '.')
            : cellValue
        ) !==
          asNumber(
            typeof value === 'string' ? value.replace(',', '.') : value
          );
      }

      return cellValue !== value;
    }

    // Multi-select
    case 'inArray': {
      if (!Array.isArray(value)) return true;
      if (Array.isArray(cellValue)) {
        return cellValue.some((entry) => value.includes(entry));
      }
      return value.includes(cellValue);
    }
    case 'notInArray': {
      if (!Array.isArray(value)) return true;
      if (Array.isArray(cellValue)) {
        return cellValue.every((entry) => !value.includes(entry));
      }
      return !value.includes(cellValue);
    }

    // Emptiness (treats null/""/"-" as empty)
    case 'isEmpty': {
      return isBlank(cellValue);
    }
    case 'isNotEmpty': {
      return !isBlank(cellValue);
    }

    // Numeric comparisons
    case 'lt': {
      if (!isNumericLike(cellValue) || !isNumericLike(value)) return false;
      return asNumber(cellValue) < asNumber(value);
    }
    case 'lte': {
      if (!isNumericLike(cellValue) || !isNumericLike(value)) return false;
      return asNumber(cellValue) <= asNumber(value);
    }
    case 'gt': {
      if (!isNumericLike(cellValue) || !isNumericLike(value)) return false;
      return asNumber(cellValue) > asNumber(value);
    }
    case 'gte': {
      if (!isNumericLike(cellValue) || !isNumericLike(value)) return false;
      return asNumber(cellValue) >= asNumber(value);
    }
    case 'isBetween': {
      if (!Array.isArray(value) || value.length !== 2) return true;
      if (
        !isNumericLike(cellValue) ||
        !value.every((entry) => isNumericLike(entry))
      ) {
        return false;
      }
      const v = asNumber(cellValue);
      const [min, max] = value.map(asNumber);
      return v >= min && v <= max;
    }

    // Dates - cellValue is row data; value is filter value. fv = fv, cv = cv. Always apply filters to fv!
    // asDateOnlys normalizes to midnight
    case 'dateEq': {
      if (!isDateFilterValue(value)) return false;
      const [fv, cv] = asDateOnlys({ filterValue: value, cellValue });
      if (!fv || !cv) return false;
      return isDateSameDay(fv, cv);
    }
    case 'dateNe': {
      if (!isDateFilterValue(value)) return false;
      const [fv, cv] = asDateOnlys({ filterValue: value, cellValue });
      if (!fv || !cv) return false;
      return !isDateSameDay(fv, cv);
    }
    case 'dateLt': {
      if (!isDateFilterValue(value)) return false;
      const [fv, cv] = asDateOnlys({ filterValue: value, cellValue });
      if (!fv || !cv) return false;
      return fv > cv;
    }
    case 'dateGt': {
      if (!isDateFilterValue(value)) return false;
      const [fv, cv] = asDateOnlys({ filterValue: value, cellValue });
      if (!fv || !cv) return false;
      return fv < cv;
    }
    case 'dateLte': {
      if (!isDateFilterValue(value)) return false;
      const [fv, cv] = asDateOnlys({ filterValue: value, cellValue });
      if (!fv || !cv) return false;
      return fv >= cv;
    }
    case 'dateGte': {
      if (!isDateFilterValue(value)) return false;
      const [fv, cv] = asDateOnlys({ filterValue: value, cellValue });
      if (!fv || !cv) return false;
      return fv <= cv;
    }
    case 'dateIsBetween': {
      const [min, max] =
        Array.isArray(value) && value.length === 2
          ? value.map((d) => timestampToDate(d))
          : [];
      const cv = cellValue instanceof Date ? cellValue : null;
      if (!min || !max || !cv) return false;
      const maxDayAdded = new Date(max);
      maxDayAdded.setDate(maxDayAdded.getDate() + 1);
      // cause dates are set to midnight we need to add a day to the max date
      return min <= cv && cv <= maxDayAdded;
    }
    default:
      return true;
  }
}

// ----- Single filterFn to handle advanced, joined operators per column -----
export const byOperator: FilterFn<EinsatzListItem> = (
  row: Row<EinsatzListItem>,
  columnId: string,
  _filterValue: unknown[]
) => {
  // hard to understand state relations lead to now only using the url to filter
  // problem was related to the filterValue not being passed correctly to our custom filterFn
  // only the value (eg. ["offen", "vergeben"]) was passed. Operator was missing.
  const filters: FilterItemSchema[] = JSON.parse(
    new URL(window.location.href).searchParams.get('filters') ?? '[]'
  );
  const relevantFilter = filters.find(
    (f: FilterItemSchema) => f.id === columnId
  );
  const isEmptyOperator =
    relevantFilter?.operator === 'isEmpty' ||
    relevantFilter?.operator === 'isNotEmpty';

  // filter not complete (eg. just changed) - show all
  if (
    !relevantFilter ||
    !relevantFilter.operator ||
    (!isEmptyOperator && !relevantFilter.value)
  )
    return true;
  const cellValue = row.getValue(columnId);

  return evalClause(cellValue, {
    operator: relevantFilter.operator,
    value: relevantFilter.value,
  });
};

export const byOperatorUseMetaField: FilterFn<EinsatzListItem> = (
  row: Row<EinsatzListItem>,
  columnId: string,
  _filterValue: unknown[]
) => {
  // hard to understand state relations lead to now only using the url to filter
  // problem was related to the filterValue not being passed correctly to our custom filterFn
  // only the value (eg. ["offen", "vergeben"]) was passed. Operator was missing.
  const filters: FilterItemSchema[] = JSON.parse(
    new URL(window.location.href).searchParams.get('filters') ?? '[]'
  );
  const relevantFilter = filters.find(
    (f: FilterItemSchema) => f.id === columnId
  );
  const isEmptyOperator =
    relevantFilter?.operator === 'isEmpty' ||
    relevantFilter?.operator === 'isNotEmpty';

  if (
    !relevantFilter ||
    !relevantFilter.operator ||
    (!isEmptyOperator && !relevantFilter.value)
  )
    return true;

  const column = row
    .getAllCells()
    .find((cell) => cell.column.id === columnId)?.column;
  const filterField = column?.columnDef.meta?.filterField ?? columnId;
  const cellValueId = get(row.original, filterField);

  return evalClause(cellValueId, {
    operator: relevantFilter.operator,
    value: relevantFilter.value,
  });
};

// Export a map you can register in useReactTable
export const filterFns = {
  byOperator,
};
