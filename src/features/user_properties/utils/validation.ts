import type { PropertyConfig, ValidationError } from '../types';

const PHONE_E164_REGEX = /^\+[1-9]\d{1,14}$/;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidDateIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

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

    if (
      config.defaultOption &&
      (!config.options || !config.options.includes(config.defaultOption))
    ) {
      errors.push({
        field: 'defaultValue',
        message: 'Die Standardoption muss in den Auswahloptionen enthalten sein',
      });
    }
  }

  if (config.fieldType === 'number' || config.fieldType === 'currency') {
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

    if (config.defaultValue && Number.isNaN(Number(config.defaultValue))) {
      errors.push({
        field: 'defaultValue',
        message: 'Der Standardwert muss eine gültige Zahl sein',
      });
    }

    if (
      config.defaultValue &&
      !Number.isNaN(Number(config.defaultValue)) &&
      config.minValue !== undefined &&
      Number(config.defaultValue) < config.minValue
    ) {
      errors.push({
        field: 'defaultValue',
        message: 'Der Standardwert darf nicht kleiner als der Minimalwert sein',
      });
    }

    if (
      config.defaultValue &&
      !Number.isNaN(Number(config.defaultValue)) &&
      config.maxValue !== undefined &&
      Number(config.defaultValue) > config.maxValue
    ) {
      errors.push({
        field: 'defaultValue',
        message: 'Der Standardwert darf nicht größer als der Maximalwert sein',
      });
    }
  }

  if (
    config.fieldType === 'text' &&
    config.maxLength !== undefined &&
    config.defaultValue &&
    config.defaultValue.length > config.maxLength
  ) {
    errors.push({
      field: 'defaultValue',
      message: 'Der Standardwert darf die maximale Länge nicht überschreiten',
    });
  }

  if (config.fieldType === 'mail' && config.defaultValue) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.defaultValue);
    if (!isEmail) {
      errors.push({
        field: 'defaultValue',
        message: 'Der Standardwert muss eine gültige E-Mail-Adresse sein',
      });
    }
  }

  if (
    config.fieldType === 'phone' &&
    config.defaultValue &&
    !PHONE_E164_REGEX.test(config.defaultValue)
  ) {
    errors.push({
      field: 'defaultValue',
      message:
        'Der Standardwert muss eine gültige Telefonnummer im Format +436641234567 sein',
    });
  }

  if (
    config.fieldType === 'date' &&
    config.defaultValue &&
    !isValidDateIso(config.defaultValue)
  ) {
    errors.push({
      field: 'defaultValue',
      message:
        'Der Standardwert muss ein gültiges Datum im Format JJJJ-MM-TT sein',
    });
  }

  if (
    config.fieldType === 'time' &&
    config.defaultValue &&
    !TIME_24H_REGEX.test(config.defaultValue)
  ) {
    errors.push({
      field: 'defaultValue',
      message: 'Der Standardwert muss eine gültige Uhrzeit im Format HH:MM sein',
    });
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
