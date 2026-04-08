import { describe, expect, it } from 'vitest';
import { shouldHideNavbar } from './navbar-visibility';

describe('shouldHideNavbar', () => {
  it('blendet die Navbar auf der Expired-Seite aus', () => {
    expect(shouldHideNavbar('/subscription-expired')).toBe(true);
  });

  it('blendet die Navbar auf oeffentlichen Auth-Routen aus', () => {
    expect(shouldHideNavbar('/signup')).toBe(true);
    expect(shouldHideNavbar('/signin')).toBe(true);
    expect(shouldHideNavbar('/forgot-password')).toBe(true);
    expect(shouldHideNavbar('/invite/token-1')).toBe(true);
  });

  it('laesst die Navbar auf regulären Routen sichtbar', () => {
    expect(shouldHideNavbar('/einsatzverwaltung')).toBe(false);
  });
});
