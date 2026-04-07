import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

const { mockGetServerSession, mockRedirect } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/lib/auth.config', () => ({
  authOptions: {},
}));

vi.mock('@/lib/auth/authGuard', () => ({
  ROLE_NAME_MAP: {
    Superadmin: 'superadmin-role',
    Einsatzverwaltung: 'einsatzverwaltung-role',
    Helfer: 'helfer-role',
  },
}));

describe('Home', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockRedirect.mockReset();
  });

  it('leitet nicht angemeldete Nutzer zur Anmeldung weiter', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      Home({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/signin');
  });

  it('ignoriert callbackUrl beim Redirect in die Verwaltungsansicht', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue({
      user: {
        roleIds: ['einsatzverwaltung-role'],
      },
    });
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      Home({
        searchParams: Promise.resolve({
          callbackUrl: '/',
          view: 'neu',
        }),
      })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/einsatzverwaltung?view=neu');
  });

  it('ignoriert callbackUrl beim Redirect in die Helferansicht', async () => {
    const redirectError = new Error('NEXT_REDIRECT');

    mockGetServerSession.mockResolvedValue({
      user: {
        roleIds: ['helfer-role'],
      },
    });
    mockRedirect.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      Home({
        searchParams: Promise.resolve({
          callbackUrl: '/signin?callbackUrl=%2F',
          foo: 'bar',
        }),
      })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/helferansicht?foo=bar');
  });
});
