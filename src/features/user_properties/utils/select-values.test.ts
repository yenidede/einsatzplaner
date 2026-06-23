import { describe, expect, it } from 'vitest';
import {
  getUnavailableSelectValues,
  parseMultiSelectValue,
  serializeMultiSelectValue,
} from './select-values';

describe('select values', () => {
  it('liest und schreibt Mehrfachwerte kommasepariert', () => {
    const parsed = parseMultiSelectValue(' Sanität,Technik ,, Logistik ');

    expect(parsed).toEqual(['Sanität', 'Technik', 'Logistik']);
    expect(serializeMultiSelectValue(parsed)).toBe('Sanität,Technik,Logistik');
  });

  it('erkennt historische Werte außerhalb der aktuellen Optionen', () => {
    expect(
      getUnavailableSelectValues(
        ['Sanität', 'Historisch'],
        ['Sanität', 'Technik']
      )
    ).toEqual(['Historisch']);
  });
});
