// filterFns.ts
import { FilterFn, Row } from "@tanstack/react-table";
import type { Operators } from "../config/data-table";
import { ETV } from "@/features/einsatz/types";
import { useUrlFilters } from "./use-url-filters";
import { FilterItemSchema } from "./parsers";

// ----- Types for Advanced Toolbar filter value -----


export type JoinOp = "and" | "or";

export type Clause = {
    value?: any;
    operator?: Operators;
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
    if (!clause?.operator) return true // No operator means filter not fully set. Show all.
    const { operator, value } = clause;

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

// ----- Single filterFn to handle advanced, joined operators per column -----

export const byOperator: FilterFn<ETV> = (
    row: Row<ETV>,
    columnId: string,
    _filterValue: any[]
) => {
    // hard to understand state relations lead to now only using the url to filter
    // problem was related to the filterValue not being passed correctly to our custom filterFn 
    // only the value (eg. ["offen", "vergeben"]) was passed. Operator was missing. 
    const filters = JSON.parse(new URL(window.location.href).searchParams.get('filters') ?? '[]');
    const relevantFilter = filters.find((f: FilterItemSchema) => f.id === columnId);

    if (!relevantFilter) throw new Error("No relevant filter found: " + columnId + ": " + JSON.stringify(filters));

    const cellValue = row.getValue(columnId);

    return evalClause(cellValue, {
        operator: relevantFilter.operator,
        value: relevantFilter.value,
    });
};

// Export a map you can register in useReactTable
export const filterFns = {
    byOperator,
};