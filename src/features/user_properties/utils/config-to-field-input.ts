import type { PropertyConfig } from '../types';

/** Field creation input (no orgId). Used by user properties and template fields. */
export type PropertyConfigFieldInput = {
  name: string;
  description?: string;
  datatype:
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'currency'
  | 'group'
  | 'date'
  | 'time'
  | 'phone'
  | 'mail';
  isRequired: boolean;
  placeholder?: string;
  defaultValue?: string;
  isMultiline?: boolean;
  min?: number;
  max?: number;
  allowedValues?: string[];
};

export function propertyConfigToFieldInput(
  config: PropertyConfig
): PropertyConfigFieldInput {
  let datatype: PropertyConfigFieldInput['datatype'];

  switch (config.fieldType) {
    case 'text':
      datatype = 'text';
      break;
    case 'number':
      datatype = 'number';
      break;
    case 'boolean':
      datatype = 'boolean';
      break;
    case 'select':
      datatype = 'select';
      break;
    case 'currency':
      datatype = 'currency';
      break;
    case 'group':
      datatype = 'group';
      break;
    case 'date':
      datatype = 'date';
      break;
    case 'time':
      datatype = 'time';
      break;
    case 'phone':
      datatype = 'phone';
      break;
    case 'mail':
      datatype = 'mail';
      break;
    default:
      throw new Error(`Unknown field type: ${config.fieldType}`);
  }

  let defaultValue: string | undefined;

  if (config.fieldType === 'boolean' && config.booleanDefaultValue !== null) {
    defaultValue = config.booleanDefaultValue ? 'true' : 'false';
  } else if (config.fieldType === 'select' && config.defaultOption) {
    defaultValue = config.defaultOption;
  } else if (config.defaultValue) {
    defaultValue = config.defaultValue;
  }

  const max =
    config.fieldType === 'text'
      ? config.maxLength
      : config.fieldType === 'number' || config.fieldType === 'currency'
        ? config.maxValue
        : undefined;

  return {
    name: config.name,
    description: config.description,
    datatype,
    isRequired: config.isRequired,
    placeholder: config.placeholder,
    defaultValue,
    isMultiline: config.isMultiline,
    min: config.minValue,
    /** @note max is used for both text and number/currency fields */
    max,
    allowedValues: config.options,
  };
}
