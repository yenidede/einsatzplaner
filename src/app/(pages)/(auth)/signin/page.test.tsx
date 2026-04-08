/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPage from './page';
import {
  buildSignInCallbackUrl,
  resolveCallbackUrl,
} from '@/features/auth/callback-url';

const { mockPush, mockSearchParamsGet, mockUseSession, mockSignIn } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockSearchParamsGet: vi.fn(),
    mockUseSession: vi.fn(),
    mockSignIn: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: () => mockUseSession(),
}));

vi.mock('@/components/SimpleFormComponents', () => ({
  Alert: () => null,
  FormField: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe('resolveCallbackUrl', () => {
  it('loest verschachtelte signin-Callback-Urls bis zur Zielroute auf', () => {
    expect(resolveCallbackUrl('/signin?callbackUrl=%2F')).toBe('/');
    expect(
      resolveCallbackUrl(
        'http://localhost:3000/signin?callbackUrl=%2Feinsatzverwaltung%3Ftab%3Doffen'
      )
    ).toBe('/einsatzverwaltung?tab=offen');
  });

  it('faellt bei ungueltigen Werten auf die Root-Route zurueck', () => {
    expect(resolveCallbackUrl('')).toBe('/');
    expect(resolveCallbackUrl('javascript:alert(1)')).toBe('/');
    expect(resolveCallbackUrl('https://evil.com/path')).toBe('/');
    expect(resolveCallbackUrl('/signin')).toBe('/');
    expect(resolveCallbackUrl('/signin?foo=bar')).toBe('/');
    expect(resolveCallbackUrl(null)).toBe('/');
  });

  it('faellt bei zu tief verschachtelten signin-Callbacks auf die Root-Route zurueck', () => {
    let nestedCallbackUrl = '/ziel';

    for (let index = 0; index < 6; index += 1) {
      nestedCallbackUrl = `/signin?callbackUrl=${encodeURIComponent(nestedCallbackUrl)}`;
    }

    expect(resolveCallbackUrl(nestedCallbackUrl)).toBe('/');
  });
});

describe('buildSignInCallbackUrl', () => {
  it('normalisiert bereits encodierte Callback-Urls fuer den Sign-out-Redirect', () => {
    expect(buildSignInCallbackUrl('/helferansicht')).toBe(
      '/signin?callbackUrl=%2Fhelferansicht'
    );
    expect(buildSignInCallbackUrl('%2Fhelferansicht')).toBe(
      '/signin?callbackUrl=%2Fhelferansicht'
    );
    expect(buildSignInCallbackUrl('/signin?callbackUrl=%2F')).toBe(
      '/signin?callbackUrl=%2F'
    );
  });
});

describe('SignInPage', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchParamsGet.mockReset();
    mockUseSession.mockReset();
    mockSignIn.mockReset();

    mockSearchParamsGet.mockImplementation((key: string) =>
      key === 'callbackUrl' ? '/signin?callbackUrl=%2Fhelferansicht' : null
    );
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
    });
  });

  it('leitet eingeloggte Nutzer zum normalisierten Callback weiter', async () => {
    render(<SignInPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/helferansicht');
    });
  });
});
