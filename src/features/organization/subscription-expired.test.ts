import { describe, expect, it } from 'vitest';
import {
  EXPIRED_ORGANIZATION_CONTACT_EMAIL,
  getExpiredOrganizationSupportText,
  isHelperOnlyOrganizationRole,
} from './subscription-expired';

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

  it('liefert fuer helper-only die Verwaltungs-Hinweisnachricht', () => {
    expect(getExpiredOrganizationSupportText(['Helfer'])).toBe(
      'Bitte wenden Sie sich an Ihre Organisationsverwaltung, um den Zugriff wieder freizuschalten.'
    );
  });

  it('liefert fuer nicht-helper-only den Kontakt-Hinweis mit E-Mail-Adresse', () => {
    expect(
      getExpiredOrganizationSupportText(['Helfer', 'Organisationsverwaltung'])
    ).toBe(
      `Bitte kontaktieren Sie Ihre Organisationsverwaltung oder schreiben Sie an ${EXPIRED_ORGANIZATION_CONTACT_EMAIL}.`
    );
  });
});
