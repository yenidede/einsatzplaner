import { describe, expect, it } from 'vitest';
import {
  getConfirmableCriteriaWarnings,
  getInformationalCreateUserPropertyWarnings,
  shouldValidateRequiredUserProperties,
  type EinsatzCriteriaWarning,
} from './einsatz-warning-handling';

const warnings: EinsatzCriteriaWarning[] = [
  {
    kind: 'helperParticipantRatio',
    message: 'Allgemein: Anzahl Teilnehmer:innen pro Helfer maximal 10',
  },
  {
    kind: 'userProperties',
    message: "Personeneigenschaften: mind. 1 Helfer mit 'Führerschein' benötigt",
  },
];

describe('einsatz warning handling', () => {
  it('verschiebt Personeneigenschaften beim Erstellen in den Info-Hinweis', () => {
    expect(getConfirmableCriteriaWarnings(warnings, true)).toEqual([
      warnings[0],
    ]);
    expect(getInformationalCreateUserPropertyWarnings(warnings, true)).toEqual([
      warnings[1],
    ]);
  });

  it('behält alle Warnungen beim Bearbeiten im Bestätigungsdialog', () => {
    expect(getConfirmableCriteriaWarnings(warnings, false)).toEqual(warnings);
    expect(getInformationalCreateUserPropertyWarnings(warnings, false)).toEqual(
      []
    );
  });

  it('überspringt Personeneigenschaften, wenn keine Personen eingetragen sind', () => {
    expect(shouldValidateRequiredUserProperties(1, 0)).toBe(false);
    expect(shouldValidateRequiredUserProperties(1, 2)).toBe(true);
    expect(shouldValidateRequiredUserProperties(0, 2)).toBe(false);
  });
});
