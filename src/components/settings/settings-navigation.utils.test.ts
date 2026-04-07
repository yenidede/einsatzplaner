/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import type { OrganizationBase } from '@/features/settings/types';
import {
  findOrganizationById,
  getOrganizationSettingsHref,
  hasActiveOrganizationSettingsAccess,
  isOrganizationManagementRole,
  isOrganizationSettingsPath,
  isUserSettingsPath,
  registerOrganizationSwitchConfirmation,
  requestOrganizationSwitchConfirmation,
} from './settings-navigation.utils';

const organizations: OrganizationBase[] = [
  {
    id: 'org-1',
    name: 'Testverein',
    helper_name_singular: 'Helfer:in',
    helper_name_plural: 'Helfer:innen',
    logo_url: null,
    small_logo_url: null,
    hasGetMailNotification: true,
    roles: [
      {
        id: 'role-1',
        name: 'Organisationsverwaltung',
        abbreviation: 'OV',
      },
    ],
  },
  {
    id: 'org-2',
    name: 'Mitgliedsverein',
    helper_name_singular: 'Helfer:in',
    helper_name_plural: 'Helfer:innen',
    logo_url: null,
    small_logo_url: null,
    hasGetMailNotification: true,
    roles: [{ id: 'role-2', name: 'Helfer:in', abbreviation: null }],
  },
];

describe('settings-navigation.utils', () => {
  it('erkennt persönliche und organisationsbezogene Settings-Pfade', () => {
    expect(isUserSettingsPath('/settings/user')).toBe(true);
    expect(isUserSettingsPath('/settings/org/org-1')).toBe(false);
    expect(isOrganizationSettingsPath('/settings/org/org-1')).toBe(true);
    expect(isOrganizationSettingsPath('/settings/vorlage/abc')).toBe(true);
    expect(isOrganizationSettingsPath('/settings/user')).toBe(false);
  });

  it('erkennt Organisationsverwaltungsrollen robust', () => {
    expect(
      isOrganizationManagementRole({
        name: 'Organisationsverwaltung',
        abbreviation: 'OV',
      })
    ).toBe(true);
    expect(
      isOrganizationManagementRole({
        name: 'Superadmin',
        abbreviation: null,
      })
    ).toBe(true);
    expect(
      isOrganizationManagementRole({
        name: 'Helfer:in',
        abbreviation: null,
      })
    ).toBe(false);
  });

  it('ermittelt den Zugriff auf aktive Organisationseinstellungen', () => {
    expect(hasActiveOrganizationSettingsAccess(organizations, 'org-1')).toBe(
      true
    );
    expect(hasActiveOrganizationSettingsAccess(organizations, 'org-2')).toBe(
      false
    );
    expect(hasActiveOrganizationSettingsAccess(organizations, null)).toBe(false);
  });

  it('findet Organisationen und erzeugt kanonische Settings-Links', () => {
    expect(findOrganizationById(organizations, 'org-1')?.name).toBe(
      'Testverein'
    );
    expect(findOrganizationById(organizations, 'unbekannt')).toBeNull();
    expect(getOrganizationSettingsHref('org-1')).toBe('/settings/org/org-1');
  });

  it('fragt eine registrierte Bestätigung für den Organisationswechsel ab', async () => {
    let resolveConfirmation: ((value: boolean) => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirmation = resolve;
        })
    );
    const cleanup = registerOrganizationSwitchConfirmation(onConfirm);

    const confirmation = requestOrganizationSwitchConfirmation();
    expect(onConfirm).toHaveBeenCalledOnce();
    resolveConfirmation?.(false);
    await expect(confirmation).resolves.toBe(false);

    cleanup();
  });

  it('erlaubt den Organisationswechsel ohne registrierte Bestätigung', async () => {
    await expect(requestOrganizationSwitchConfirmation()).resolves.toBe(true);
  });
});
