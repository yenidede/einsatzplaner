import { isFieldTypeKey } from '@/features/user_properties/field-type-definitions';
import type { PropertyConfig } from '@/features/user_properties/types';
import { parseMultiSelectValue } from './select-values';

type FieldConfigSource = {
  name: string | null;
  description: string | null;
  placeholder: string | null;
  default_value: string | null;
  is_multiline: boolean | null;
  min: number | null;
  max: number | null;
  allowed_values: string[];
  is_required: boolean;
  type: {
    datatype: string | null;
  } | null;
};

export function fieldToPropertyConfig(
  field: FieldConfigSource
): PropertyConfig | null {
  const datatype = field.type?.datatype;
  if (!datatype || !isFieldTypeKey(datatype)) {
    return null;
  }

  const booleanDefaultValue =
    datatype === 'boolean'
      ? field.default_value === 'true'
        ? true
        : field.default_value === 'false'
          ? false
          : null
      : null;

  return {
    name: field.name ?? '',
    description: field.description ?? '',
    fieldType: datatype === 'multiselect' ? 'select' : datatype,
    placeholder: field.placeholder ?? '',
    maxLength: datatype === 'text' && field.max != null ? field.max : undefined,
    isMultiline: datatype === 'text' ? (field.is_multiline ?? false) : false,
    minValue:
      datatype === 'number' || datatype === 'currency'
        ? (field.min ?? undefined)
        : undefined,
    maxValue:
      datatype === 'number' || datatype === 'currency'
        ? (field.max ?? undefined)
        : undefined,
    isDecimal: datatype === 'currency',
    trueLabel: 'Ja',
    falseLabel: 'Nein',
    booleanDefaultValue,
    options:
      datatype === 'select' || datatype === 'multiselect'
        ? field.allowed_values
        : [],
    defaultOption:
      datatype === 'select' ? (field.default_value ?? undefined) : undefined,
    defaultOptions:
      datatype === 'multiselect'
        ? parseMultiSelectValue(field.default_value)
        : [],
    isMultiSelect: datatype === 'multiselect',
    isRequired: field.is_required,
    defaultValue:
      datatype === 'boolean' ||
      datatype === 'select' ||
      datatype === 'multiselect'
        ? ''
        : (field.default_value ?? ''),
  };
}
