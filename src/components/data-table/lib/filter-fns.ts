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

type asDateOnlyFnProps = {
  filterValue: string | number | Date;
  cellValue: unknown;
};

/**
 * Convert a date-like value into a Date normalized to the start of that day, or return `null` for invalid input.
 *
 * @param timestamp - A Date object, a numeric epoch timestamp (milliseconds), or a string containing only digits representing a numeric timestamp.
 * @returns A Date whose time is set to midnight of the corresponding day for valid inputs, or `null` if the input cannot be parsed into a valid date.
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
 * Normalize filter and cell inputs to date-only (midnight) values.
 *
 * @param filterValue - A timestamp-like value (string, number, or Date) to convert to a date at midnight; if it cannot be parsed, the corresponding output slot is left undefined.
 * @param cellValue - A Date to convert to a date at midnight; if not a Date, the corresponding output slot is left undefined.
 * @returns An array where index 0 is the normalized Date derived from `filterValue` (if valid) and index 1 is the normalized Date derived from `cellValue` (if `cellValue` is a Date); entries are omitted when their inputs are invalid or missing.
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
 * @param cellValue - The value from the row cell to evaluate (may be any type).
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
      return cellValue === value;
    }
    case 'ne': {
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
      return asNumber(cellValue) < asNumber(value);
    }
    case 'lte': {
      return asNumber(cellValue) <= asNumber(value);
    }
    case 'gt': {
      return asNumber(cellValue) > asNumber(value);
    }
    case 'gte': {
      return asNumber(cellValue) >= asNumber(value);
    }
    case 'isBetween': {
      if (!Array.isArray(value) || value.length !== 2) return true;
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

  // filter not complete (eg. just changed) - show all
  if (!relevantFilter || !relevantFilter.operator || !relevantFilter.value)
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

  if (!relevantFilter || !relevantFilter.operator || !relevantFilter.value)
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
