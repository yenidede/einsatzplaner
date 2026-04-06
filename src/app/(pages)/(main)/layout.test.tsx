import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MainLayout from './layout';

const { mockGetServerSession, mockRedirect, mockGetOrganizationAccessState } =
  vi.hoisted(() => ({
    mockGetServerSession: vi.fn(),
    mockRedirect: vi.fn(),
    mockGetOrganizationAccessState: vi.fn(),
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

describe('MainLayout', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockRedirect.mockReset();
    mockGetOrganizationAccessState.mockReset();
  });

  it('leitet nicht angemeldete Nutzer zur Anmeldung weiter', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      MainLayout({
        children: <div>Geschuetzter Inhalt</div>,
      })
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/signin');
  });

  it('rendert normale Inhalte fuer nutzbare aktive Organisationen', async () => {
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
      trial_ends_at: new Date('2026-04-02T12:00:00.000Z'),
    });

    const markup = renderToStaticMarkup(
      await MainLayout({
        children: <div>Geschuetzter Inhalt</div>,
      })
    );

    expect(markup).toContain('Geschuetzter Inhalt');
    expect(markup).not.toContain('nicht verfuegbar');
  });

  it('leitet fuer abgelaufene aktive Organisationen auf die Expired-Seite weiter', async () => {
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
      subscription_status: 'expired',
      trial_starts_at: new Date('2026-04-01T12:00:00.000Z'),
      trial_ends_at: new Date('2026-04-20T12:00:00.000Z'),
    });
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      MainLayout({
        children: <div>Geschuetzter Inhalt</div>,
      })
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/subscription-expired');
  });
});
