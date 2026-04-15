import { describe, expect, it } from 'vitest';
import {
  hasAnalyticsAccessInOrgRoles,
  isAnalyticsSuperadminInOrgRoles,
} from './permissions';

describe('analytics permissions', () => {
  it('erlaubt Zugriff für OV, EV und Superadmin', () => {
    expect(
      hasAnalyticsAccessInOrgRoles([
        { role: { name: 'Organisationsverwaltung', abbreviation: 'OV' } },
      ])
    ).toBe(true);
    expect(
      hasAnalyticsAccessInOrgRoles([
        { role: { name: 'Einsatzverwaltung', abbreviation: 'EV' } },
      ])
    ).toBe(true);
    expect(
      hasAnalyticsAccessInOrgRoles([
        { role: { name: 'Superadmin', abbreviation: null } },
      ])
    ).toBe(true);
  });

  it('verweigert Zugriff für Helfer', () => {
    expect(
      hasAnalyticsAccessInOrgRoles([
        { role: { name: 'Helfer', abbreviation: null } },
      ])
    ).toBe(false);
  });

  it('erkennt Superadmin separat für Löschrechte', () => {
    expect(
      isAnalyticsSuperadminInOrgRoles([
        { role: { name: 'Superadmin', abbreviation: null } },
      ])
    ).toBe(true);
    expect(
      isAnalyticsSuperadminInOrgRoles([
        { role: { name: 'Einsatzverwaltung', abbreviation: 'EV' } },
      ])
    ).toBe(false);
  });
});
