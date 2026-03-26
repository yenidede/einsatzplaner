import type { InputHTMLAttributes } from 'react';

const INPUT_PROP_DATATYPES = [
  'text',
  'number',
  'currency',
  'phone',
  'mail',
  'date',
  'time',
] as const;

export type InputPropDatatype = (typeof INPUT_PROP_DATATYPES)[number];

export type InputPropOptions = {
  placeholder?: string | null;
  min?: number | null;
  max?: number | null;
};

/**
 * Checks whether a value is one of the supported input datatypes.
 *
 * @param datatype - The value to test; may be a string, `null`, or `undefined`
 * @returns `true` if `datatype` is one of the allowed `InputPropDatatype` values, `false` otherwise
 */
export function isInputPropDatatype(
  datatype: string | null | undefined
): datatype is InputPropDatatype {
  return (
    typeof datatype === 'string' &&
    INPUT_PROP_DATATYPES.includes(datatype as InputPropDatatype)
  );
}

/**
 * Produce HTML input attributes tailored to a constrained input "datatype".
 *
 * Optional `opts` are normalized: `placeholder` is used only when it's a string; `min` and `max` are used only when they are numbers.
 *
 * @param datatype - The input datatype to map (one of `'text' | 'number' | 'currency' | 'phone' | 'mail' | 'date' | 'time'`).
 * @param opts - Optional configuration: `placeholder?: string | null`, `min?: number | null`, `max?: number | null`.
 * @returns An object of `InputHTMLAttributes<HTMLInputElement>` configured for the given `datatype` (for example, `'text'` sets `type: 'text'` with `minLength`/`maxLength`, `'number'` sets `type: 'number'` with `step`, `'currency'` sets `step: 0.5` and `inputMode: 'decimal'`, `'phone'` maps to `type: 'tel'`, and the remaining datatypes set the corresponding input type plus an optional `placeholder`).
 */
export function getInputPropsForDatatype(
  datatype: InputPropDatatype,
  opts?: InputPropOptions
): InputHTMLAttributes<HTMLInputElement> {
  const placeholder =
    typeof opts?.placeholder === 'string' ? opts.placeholder : undefined;
  const min = typeof opts?.min === 'number' ? opts.min : undefined;
  const max = typeof opts?.max === 'number' ? opts.max : undefined;

  switch (datatype) {
    case 'text':
      return { type: 'text', placeholder, minLength: min, maxLength: max };
    case 'number':
      return { type: 'number', step: 1, min, max };
    case 'currency':
      return { type: 'number', step: 0.5, inputMode: 'decimal', min, max };
    case 'phone':
      return { type: 'tel', placeholder };
    case 'mail':
      return { type: 'email', placeholder };
    case 'date':
      return { type: 'date', placeholder };
    case 'time':
      return { type: 'time', placeholder };
  }
}
