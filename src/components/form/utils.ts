export function sanitizeString(str: string): string {
    return str.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

// Currency helpers: operate in integer cents to avoid floating point errors
export const toCents = (n: number | null | undefined) => Math.round(((n ?? 0) as number) * 100);
export const fromCents = (c: number) => Math.round(c) / 100;
export const calcTotal = (pricePerPerson: number | null | undefined, participantCount: number | null | undefined) =>
    fromCents(toCents(pricePerPerson) * Math.max(0, participantCount ?? 0));
export const calcPricePerPersonFromTotal = (total: number | null | undefined, participantCount: number | null | undefined) => {
    const count = Math.max(0, participantCount ?? 0);
    if (count <= 0) return 0;
    const perCents = Math.round(toCents(total) / count);
    return fromCents(perCents);
};

// Dynamic form: build input props from datatype and field constraints
import type { InputHTMLAttributes } from "react";
export function buildInputProps(
    datatype?: string | null,
    opts?: { placeholder?: string | null; min?: number | null; max?: number | null }
): InputHTMLAttributes<HTMLInputElement> {
    const placeholder = typeof opts?.placeholder === "string" ? opts.placeholder : undefined;
    const min = typeof opts?.min === "number" ? opts.min : undefined;
    const max = typeof opts?.max === "number" ? opts.max : undefined;

    switch (datatype) {
        case "text":
            return { type: "text", placeholder, minLength: min, maxLength: max };
        case "number":
            return { type: "number", step: 1, min, max };
        case "currency":
            return { type: "number", step: 0.01, inputMode: "decimal", min, max };
        case "date":
            return { type: "date" };
        case "datetime":
            return { type: "datetime-local" };
        default:
            return {};
    }
}