import type { PropertyConfig, ValidationError } from '../types';

export function validatePropertyConfig(
  config: PropertyConfig,
  existingNames: string[] = []
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.name.trim()) {
    errors.push({
      field: 'name',
      message: 'Name der Eigenschaft darf nicht leer sein',
    });
  }
  if (
    config.name.trim() &&
    existingNames.includes(config.name.trim().toLowerCase())
  ) {
    errors.push({
      field: 'name',
      message: 'Eine Eigenschaft mit diesem Namen existiert bereits',
    });
  }

  if (config.fieldType === 'select') {
    if (!config.options || config.options.length === 0) {
      errors.push({
        field: 'options',
        message: 'Mindestens eine Auswahloption muss angegeben werden',
      });
    }
  }

  if (config.fieldType === 'number') {
    if (
      config.minValue !== undefined &&
      config.maxValue !== undefined &&
      config.minValue > config.maxValue
    ) {
      errors.push({
        field: 'minValue',
        message: 'Minimalwert darf nicht größer als Maximalwert sein',
      });
    }
  }

  return errors;
}

export function getRequiredFieldWarning(
  isRequired: boolean,
  existingUserCount: number
): string | null {
  if (isRequired && existingUserCount > 0) {
    return `Diese Eigenschaft ist Pflicht. Bestehende ${existingUserCount} Person(en) ohne Wert müssen nachgetragen werden.`;
  }
  return null;
}
