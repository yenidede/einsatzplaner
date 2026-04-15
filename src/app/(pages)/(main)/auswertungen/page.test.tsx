import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuswertungenPage from './page';

const { mockGetServerSession, mockRedirect, mockGetUserRolesInOrganization } =
  vi.hoisted(() => ({
    mockGetServerSession: vi.fn(),
    mockRedirect: vi.fn(),
    mockGetUserRolesInOrganization: vi.fn(),
  }));

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/DataAccessLayer/user', () => ({
  getUserRolesInOrganization: mockGetUserRolesInOrganization,
}));

vi.mock('@/lib/auth.config', () => ({
  authOptions: {},
}));

vi.mock('@/lib/auth/authGuard', () => ({
  ROLE_NAME_MAP: {
    Helfer: 'helfer-role',
  },
}));

vi.mock('@/components/analytics/AnalyticsPage', () => ({
  AnalyticsPage: () => <div>Analytics</div>,
}));

describe('AuswertungenPage', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockRedirect.mockReset();
    mockGetUserRolesInOrganization.mockReset();
  });

  it('leitet nicht angemeldete Nutzer zur Anmeldung weiter', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(AuswertungenPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/signin');
  });

  it('leitet Helfer zur Helferansicht weiter', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        roleIds: ['helfer-role'],
        activeOrganization: { id: 'org-1' },
      },
    });
    mockGetUserRolesInOrganization.mockResolvedValue([
      { role: { name: 'Helfer', abbreviation: null } },
    ]);
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(AuswertungenPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/helferansicht');
  });

  it('rendert die Analytics-Seite für EV', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        roleIds: [],
        activeOrganization: { id: 'org-1' },
      },
    });
    mockGetUserRolesInOrganization.mockResolvedValue([
      { role: { name: 'Einsatzverwaltung', abbreviation: 'EV' } },
    ]);

    const result = await AuswertungenPage();

    expect(result).toBeTruthy();
  });
});
