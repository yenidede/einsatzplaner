import { describe, expect, it } from 'vitest';
import type { PropertyConfig } from '../types';
import { validatePropertyConfig } from './validation';

function createBaseConfig(
  overrides: Partial<PropertyConfig> = {}
): PropertyConfig {
  return {
    name: 'Kontakt',
    description: '',
    fieldType: 'text',
    placeholder: '',
    maxLength: undefined,
    isMultiline: false,
    minValue: undefined,
    maxValue: undefined,
    isDecimal: false,
    trueLabel: 'Ja',
    falseLabel: 'Nein',
    booleanDefaultValue: null,
    options: [],
    defaultOption: undefined,
    isRequired: false,
    defaultValue: '',
    ...overrides,
  };
}

describe('validatePropertyConfig', () => {
  it('validiert Standardwert bei E-Mail-Feldern', () => {
    const errors = validatePropertyConfig(
      createBaseConfig({
        fieldType: 'mail',
        defaultValue: 'ungueltig',
      })
    );

    expect(errors).toContainEqual({
      field: 'defaultValue',
      message: 'Der Standardwert muss eine gültige E-Mail-Adresse sein',
    });
  });

  it('validiert Standardwert bei Telefonfeldern', () => {
    const errors = validatePropertyConfig(
      createBaseConfig({
        fieldType: 'phone',
        defaultValue: '06641234567',
      })
    );

    expect(errors).toContainEqual({
      field: 'defaultValue',
      message:
        'Der Standardwert muss eine gültige Telefonnummer im Format +436641234567 sein',
    });
  });

  it('validiert Standardwert bei Datumsfeldern', () => {
    const errors = validatePropertyConfig(
      createBaseConfig({
        fieldType: 'date',
        defaultValue: '2026-02-31',
      })
    );

    expect(errors).toContainEqual({
      field: 'defaultValue',
      message:
        'Der Standardwert muss ein gültiges Datum im Format JJJJ-MM-TT sein',
    });
  });

  it('validiert Standardwert bei Uhrzeitfeldern', () => {
    const errors = validatePropertyConfig(
      createBaseConfig({
        fieldType: 'time',
        defaultValue: '25:99',
      })
    );

    expect(errors).toContainEqual({
      field: 'defaultValue',
      message: 'Der Standardwert muss eine gültige Uhrzeit im Format HH:MM sein',
    });
  });

  it('validiert Standardwert innerhalb des Zahlenbereichs', () => {
    const errors = validatePropertyConfig(
      createBaseConfig({
        fieldType: 'number',
        minValue: 10,
        maxValue: 20,
        defaultValue: '5',
      })
    );

    expect(errors).toContainEqual({
      field: 'defaultValue',
      message: 'Der Standardwert darf nicht kleiner als der Minimalwert sein',
    });
  });

  it('erkennt ungueltige Standardoptionen bei Auswahlfeldern', () => {
    const errors = validatePropertyConfig(
      createBaseConfig({
        fieldType: 'select',
        options: ['A', 'B'],
        defaultOption: 'C',
      })
    );

    expect(errors).toContainEqual({
      field: 'defaultValue',
      message: 'Die Standardoption muss in den Auswahloptionen enthalten sein',
    });
  });
});
