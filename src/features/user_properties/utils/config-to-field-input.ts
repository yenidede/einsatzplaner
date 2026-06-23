import type { PropertyConfig } from '../types';
import { serializeMultiSelectValue } from './select-values';
import { validatePropertyConfig } from './validation';

/** Field creation input (no orgId). Used by user properties and template fields. */
export type PropertyConfigFieldInput = {
  name: string;
  description?: string;
  datatype:
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'multiselect'
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
  const validationErrors = validatePropertyConfig(config);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.map((error) => error.message).join(' '));
  }

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
      datatype = config.isMultiSelect ? 'multiselect' : 'select';
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
      throw new Error(`Unbekannter Feldtyp: ${config.fieldType}`);
  }

  let defaultValue: string | undefined;

  if (config.fieldType === 'boolean' && config.booleanDefaultValue !== null) {
    defaultValue = config.booleanDefaultValue ? 'true' : 'false';
  } else if (config.fieldType === 'select' && config.isMultiSelect) {
    const serializedDefaultOptions = serializeMultiSelectValue(
      config.defaultOptions ?? []
    );
    defaultValue = serializedDefaultOptions || undefined;
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
    placeholder:
      config.fieldType === 'date' || config.fieldType === 'time'
        ? undefined
        : config.placeholder,
    defaultValue,
    isMultiline: config.isMultiline,
    min: config.minValue,
    /** @note max is used for both text and number/currency fields */
    max,
    allowedValues: config.options,
  };
}
