import { describe, expect, it } from 'vitest';
import type { PropertyConfig } from '../types';
import { propertyConfigToFieldInput } from './config-to-field-input';
import { fieldToPropertyConfig } from './field-to-property-config';

function createMultiSelectConfig(): PropertyConfig {
  return {
    name: 'Bereich',
    description: '',
    fieldType: 'select',
    options: ['Sanität', 'Technik'],
    defaultOptions: ['Sanität', 'Technik'],
    isMultiSelect: true,
    isRequired: true,
  };
}

describe('property config mapping', () => {
  it('serialisiert Mehrfachauswahl und Standardwerte kommasepariert', () => {
    expect(propertyConfigToFieldInput(createMultiSelectConfig())).toMatchObject(
      {
        datatype: 'multiselect',
        defaultValue: 'Sanität,Technik',
        allowedValues: ['Sanität', 'Technik'],
      }
    );
  });

  it('stellt gespeicherte Mehrfachauswahl wieder als Auswahlkonfiguration her', () => {
    expect(
      fieldToPropertyConfig({
        name: 'Bereich',
        description: '',
        placeholder: null,
        default_value: 'Sanität,Technik',
        is_multiline: null,
        min: null,
        max: null,
        allowed_values: ['Sanität', 'Technik'],
        is_required: true,
        type: { datatype: 'multiselect' },
      })
    ).toMatchObject({
      fieldType: 'select',
      isMultiSelect: true,
      defaultOptions: ['Sanität', 'Technik'],
    });
  });

  it('blockiert ungültige Optionen auch beim Persistierungs-Mapping', () => {
    expect(() =>
      propertyConfigToFieldInput({
        ...createMultiSelectConfig(),
        options: ['Sanität,Technik'],
        defaultOptions: [],
      })
    ).toThrow('Auswahloptionen dürfen kein Komma enthalten');
  });
});
