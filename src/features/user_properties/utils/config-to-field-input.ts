import type { PropertyConfig } from '../types';

/** Field creation input (no orgId). Used by user properties and template fields. */
export type PropertyConfigFieldInput = {
  name: string;
  description?: string;
  datatype: 'text' | 'number' | 'boolean' | 'select';
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
  let datatype: 'text' | 'number' | 'boolean' | 'select';

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
    config.fieldType === 'text' ? config.maxLength : config.maxValue;

  return {
    name: config.name,
    description: config.description,
    datatype,
    isRequired: config.isRequired,
    placeholder: config.placeholder,
    defaultValue,
    isMultiline: config.isMultiline,
    min: config.minValue,
    max,
    allowedValues: config.options,
  };
}
