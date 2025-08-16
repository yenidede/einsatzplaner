// filterFns.ts
import { FilterFn, Row } from "@tanstack/react-table";
import type { Operators } from "../config/data-table";

// ----- Types for Advanced Toolbar filter value -----


export type JoinOp = "and" | "or";

export type Clause = {
    operator: Operators;
    // For isBetween: value: [min, max]
    // For inArray/notInArray (multiSelect): value: any[]
    // For isRelativeToToday: value: { days?: number } (extend as needed)
    value?: any;
};

export type ColumnFilterValue = {
    join: JoinOp;
    clauses: Clause[];
};

// ----- Helpers -----

const toLower = (v: unknown) =>
    v == null ? "" : String(v).toLowerCase();

const isBlank = (v: unknown) => v == null || v === "";

const asNumber = (v: unknown) =>
    typeof v === "number" ? v : Number(v);

const asDate = (v: unknown) =>
    v instanceof Date ? v : new Date(v as any);


// Evaluate one clause against a single cell value
function evalClause(cellValue: any, clause: Clause): boolean {
    const { operator, value } = clause;
    console.log("evaluate clause:", { cellValue, operator, value });

    switch (operator) {
        // Text (case-insensitive)
        case "iLike": {
            return toLower(cellValue).includes(toLower(value));
        }
        case "notILike": {
            return !toLower(cellValue).includes(toLower(value));
        }

        // Equality / inequality (works for text/number/boolean/select)
        case "eq": {
            return cellValue === value;
        }
        case "ne": {
            return cellValue !== value;
        }

        // Multi-select
        case "inArray": {
            return Array.isArray(value) ? value.includes(cellValue) : true;
        }
        case "notInArray": {
            return Array.isArray(value) ? !value.includes(cellValue) : true;
        }

        // Emptiness (treats null/"" as empty)
        case "isEmpty": {
            return isBlank(cellValue);
        }
        case "isNotEmpty": {
            return !isBlank(cellValue);
        }

        // Numeric comparisons
        case "lt": {
            return asNumber(cellValue) < asNumber(value);
        }
        case "lte": {
            return asNumber(cellValue) <= asNumber(value);
        }
        case "gt": {
            return asNumber(cellValue) > asNumber(value);
        }
        case "gte": {
            return asNumber(cellValue) >= asNumber(value);
        }
        case "isBetween": {
            if (!Array.isArray(value) || value.length !== 2) return true;
            const v = asNumber(cellValue);
            const [min, max] = value.map(asNumber);
            return v >= min && v <= max;
        }

        // Dates
        case "isRelativeToToday": {
            // Example: value = { days: -7 }  -> last 7 days
            const d = asDate(cellValue);
            if (Number.isNaN(d.getTime())) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (value?.days != null) {
                const from = new Date(today);
                from.setDate(today.getDate() + Number(value.days));
                // If days is negative, range is [from, today]; if positive, [today, to]
                if (value.days <= 0) {
                    return d >= from && d <= today;
                } else {
                    const to = new Date(today);
                    to.setDate(today.getDate() + Number(value.days));
                    return d >= today && d <= to;
                }
            }
            return true;
        }

        default:
            return true;
    }
}

// Evaluate a whole column filter value (join: and/or over clauses)
function evalColumnValue(
    cellValue: any,
    filterValue: ColumnFilterValue
): boolean {
    const { join, clauses } = filterValue ?? {};
    if (!clauses || clauses.length === 0) return true;

    if (join === "or") {
        return clauses.some((clause) => evalClause(cellValue, clause));
    }
    // default AND
    return clauses.every((clause) => evalClause(cellValue, clause));
}

// ----- Single filterFn to handle advanced, joined operators per column -----

export const byOperator: FilterFn<any> = (
    row: Row<any>,
    columnId: string,
    filterValue: ColumnFilterValue
) => {
    console.log("filtering", row.getValue(columnId), filterValue);
    const cellValue = row.getValue(columnId);
    return evalColumnValue(cellValue, filterValue);
};

// Export a map you can register in useReactTable
export const filterFns = {
    byOperator,
};