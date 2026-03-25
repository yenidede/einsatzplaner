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

export function isInputPropDatatype(
  datatype: string | null | undefined
): datatype is InputPropDatatype {
  return (
    typeof datatype === 'string' &&
    INPUT_PROP_DATATYPES.includes(datatype as InputPropDatatype)
  );
}

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
