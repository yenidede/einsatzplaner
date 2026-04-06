import { describe, expect, it } from 'vitest';
import { isHelperOnlyOrganizationRole } from './subscription-expired';

describe('isHelperOnlyOrganizationRole', () => {
  it('erkennt reine Helfer-Rollen', () => {
    expect(isHelperOnlyOrganizationRole(['Helfer'])).toBe(true);
  });

  it('erkennt gemischte Rollen als nicht helper-only', () => {
    expect(
      isHelperOnlyOrganizationRole(['Helfer', 'Organisationsverwaltung'])
    ).toBe(false);
  });

  it('behandelt fehlende Rollen defensiv als nicht helper-only', () => {
    expect(isHelperOnlyOrganizationRole([])).toBe(false);
  });
});
