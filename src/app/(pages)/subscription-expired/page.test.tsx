import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionExpiredPage from './page';

const {
  mockGetServerSession,
  mockRedirect,
  mockGetOrganizationAccessState,
  mockGetUserRolesInOrganization,
} = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockRedirect: vi.fn(),
  mockGetOrganizationAccessState: vi.fn(),
  mockGetUserRolesInOrganization: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth.config', () => ({
  authOptions: {},
}));

vi.mock('@/features/organization/org-dal', () => ({
  getOrganizationAccessState: mockGetOrganizationAccessState,
}));

vi.mock('@/DataAccessLayer/user', () => ({
  getUserRolesInOrganization: mockGetUserRolesInOrganization,
}));

describe('SubscriptionExpiredPage', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockRedirect.mockReset();
    mockGetOrganizationAccessState.mockReset();
    mockGetUserRolesInOrganization.mockReset();
  });

  it('leitet nicht angemeldete Nutzer zur Anmeldung weiter', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(SubscriptionExpiredPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/signin');
  });

  it('leitet Nutzer mit nutzbarer aktiver Organisation zur App zurueck', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        activeOrganization: { id: 'org-1', name: 'Testverein', logo_url: null },
      },
    });
    mockGetOrganizationAccessState.mockResolvedValue({
      id: 'org-1',
      name: 'Testverein',
      subscription_status: 'active',
      trial_starts_at: new Date('2026-04-01T12:00:00.000Z'),
      trial_ends_at: new Date('2026-04-20T12:00:00.000Z'),
    });
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(SubscriptionExpiredPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('zeigt fuer helper-only Nutzer nur den allgemeinen Hinweis', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        activeOrganization: { id: 'org-1', name: 'Testverein', logo_url: null },
      },
    });
    mockGetOrganizationAccessState.mockResolvedValue({
      id: 'org-1',
      name: 'Testverein',
      subscription_status: 'expired',
      trial_starts_at: new Date('2026-04-01T12:00:00.000Z'),
      trial_ends_at: new Date('2026-04-20T12:00:00.000Z'),
    });
    mockGetUserRolesInOrganization.mockResolvedValue([
      {
        role: {
          id: 'role-1',
          name: 'Helfer',
          abbreviation: 'H',
        },
      },
    ]);

    const markup = renderToStaticMarkup(await SubscriptionExpiredPage());

    expect(markup).toContain(
      'Bitte wenden Sie sich an Ihre Organisationsverwaltung'
    );
    expect(markup).not.toContain('hello@davidkathrein.at');
    expect(markup).not.toContain('mailto:hello@davidkathrein.at');
  });

  it('zeigt fuer Nicht-nur-Helfer die direkte Kontaktadresse', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        activeOrganization: { id: 'org-1', name: 'Testverein', logo_url: null },
      },
    });
    mockGetOrganizationAccessState.mockResolvedValue({
      id: 'org-1',
      name: 'Testverein',
      subscription_status: 'expired',
      trial_starts_at: new Date('2026-04-01T12:00:00.000Z'),
      trial_ends_at: new Date('2026-04-20T12:00:00.000Z'),
    });
    mockGetUserRolesInOrganization.mockResolvedValue([
      {
        role: {
          id: 'role-1',
          name: 'Organisationsverwaltung',
          abbreviation: 'OV',
        },
      },
    ]);

    const markup = renderToStaticMarkup(await SubscriptionExpiredPage());

    expect(markup).toContain('hello@davidkathrein.at');
    expect(markup).toContain('mailto:hello@davidkathrein.at');
  });
});
