export function sanitizeString(str: string): string {
  return str.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

// Currency helpers: operate in integer cents to avoid floating point errors
export const toCents = (n: number | null | undefined) =>
  Math.round(((n ?? 0) as number) * 100);
export const fromCents = (c: number) => Math.round(c) / 100;
export const calcTotal = (
  pricePerPerson: number | null | undefined,
  participantCount: number | null | undefined
) => fromCents(toCents(pricePerPerson) * Math.max(0, participantCount ?? 0));
export const calcPricePerPersonFromTotal = (
  total: number | null | undefined,
  participantCount: number | null | undefined
) => {
  const count = Math.max(0, participantCount ?? 0);
  if (count <= 0) return 0;
  const perCents = Math.round(toCents(total) / count);
  return fromCents(perCents);
};

// Dynamic form: build input props from datatype and field constraints
import type { InputHTMLAttributes } from 'react';
import {
  getInputPropsForDatatype,
  isInputPropDatatype,
} from '@/lib/input-props';

/**
 * Construct HTML input attributes appropriate for a named datatype.
 *
 * @param datatype - The datatype name to build props for; if not a recognized datatype an empty object is returned.
 * @param opts - Optional constraints applied to the generated props.
 * @param opts.placeholder - Optional placeholder text to apply to the input.
 * @param opts.min - Optional minimum numeric constraint to apply where applicable.
 * @param opts.max - Optional maximum numeric constraint to apply where applicable.
 * @returns An object of `InputHTMLAttributes<HTMLInputElement>` configured for `datatype`, or `{}` if `datatype` is not recognized.
 */
export function buildInputProps(
  datatype?: string | null,
  opts?: {
    placeholder?: string | null;
    min?: number | null;
    max?: number | null;
  }
): InputHTMLAttributes<HTMLInputElement> {
  if (!isInputPropDatatype(datatype)) {
    return {};
  }

  return getInputPropsForDatatype(datatype, opts);
}
