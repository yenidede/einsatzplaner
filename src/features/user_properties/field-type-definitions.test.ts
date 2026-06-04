import { describe, expect, it } from 'vitest';
import {
  getFieldTypeDefinition,
  getFieldTypeLabel,
} from './field-type-definitions';

describe('getFieldTypeLabel', () => {
  it('übersetzt gespeicherte Datentypen ins Deutsche', () => {
    expect(getFieldTypeLabel('phone')).toBe('Telefon');
    expect(getFieldTypeLabel('multiselect')).toBe('Mehrfachauswahl');
  });

  it('liefert für unbekannte Datentypen keinen irreführenden Text', () => {
    expect(getFieldTypeLabel('unbekannt')).toBeNull();
  });

  it('liefert auch für Mehrfachauswahl eine Definition', () => {
    expect(getFieldTypeDefinition('multiselect')?.label).toBe(
      'Mehrfachauswahl'
    );
  });
});
