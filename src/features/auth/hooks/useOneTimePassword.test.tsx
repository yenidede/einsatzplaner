/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authQueryKeys } from '@/features/auth/queryKeys';
import { useOneTimePassword } from './useOneTimePassword';

const { mockSendOneTimePasswordAction, mockVerifyOneTimePasswordAction } =
  vi.hoisted(() => ({
    mockSendOneTimePasswordAction: vi.fn(),
    mockVerifyOneTimePasswordAction: vi.fn(),
  }));

vi.mock('@/features/auth/actions', () => ({
  sendOneTimePasswordAction: mockSendOneTimePasswordAction,
  verifyOneTimePasswordAction: mockVerifyOneTimePasswordAction,
}));

describe('useOneTimePassword', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    return {
      queryClient,
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    };
  };

  beforeEach(() => {
    mockSendOneTimePasswordAction.mockReset();
    mockVerifyOneTimePasswordAction.mockReset();

    mockSendOneTimePasswordAction.mockResolvedValue({
      data: {
        challengeId: 'challenge-1',
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 1_000).toISOString(),
      },
    });

    mockVerifyOneTimePasswordAction.mockResolvedValue({
      data: {
        challengeId: 'challenge-1',
        verified: true,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
    });
  });

  it('sendet automatisch bei einer gültigen E-Mail-Adresse', async () => {
    const { wrapper } = createWrapper();

    renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledOnce();
    });
  });

  it('sendet nicht bei leerer oder ungültiger E-Mail-Adresse', async () => {
    const { wrapper } = createWrapper();

    renderHook(() => useOneTimePassword({ email: 'ungueltig' }), {
      wrapper,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSendOneTimePasswordAction).not.toHaveBeenCalled();
  });

  it('verifiziert automatisch bei 6 Ziffern', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledOnce();
    });

    act(() => {
      result.current.setCode('123456');
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalledWith({
        email: 'david@example.com',
        code: '123456',
      });
    });
    await waitFor(() => {
      expect(result.current.isVerified).toBe(true);
    });
  });

  it('erlaubt Resend erst nach dem Cooldown', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.canResend).toBe(false);
      expect(result.current.resendRemainingSeconds).toBeGreaterThan(0);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });

    await waitFor(() => {
      expect(result.current.canResend).toBe(true);
      expect(result.current.resendRemainingSeconds).toBe(0);
    });
  });

  it('setzt Code, Status und Challenge zurück, wenn sich die E-Mail-Adresse ändert', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ email }) =>
        useOneTimePassword({
          email,
        }),
      {
        wrapper,
        initialProps: {
          email: 'david@example.com',
        },
      }
    );

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledOnce();
    });

    act(() => {
      result.current.setCode('123456');
    });

    await waitFor(() => {
      expect(result.current.isVerified).toBe(true);
    });

    rerender({
      email: 'andere@example.com',
    });

    await waitFor(() => {
      expect(result.current.code).toBe('');
      expect(result.current.isVerified).toBe(false);
      expect(result.current.challengeId).toBeNull();
    });

    expect(
      queryClient.getQueryState(
        authQueryKeys.oneTimePassword.status('david@example.com')
      )
    ).toBeUndefined();
    expect(
      queryClient.getQueryState(
        authQueryKeys.oneTimePassword.verifiedChallenge('david@example.com')
      )
    ).toBeUndefined();
  });

  it('entprellt parallele Send- und Verify-Aufrufe', async () => {
    let resolveSend: ((value: { data: { challengeId: string; expiresAt: string; resendAvailableAt: string } }) => void) | null =
      null;
    let resolveVerify: ((value: { data: { challengeId: string; verified: true; expiresAt: string } }) => void) | null =
      null;

    mockSendOneTimePasswordAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );
    mockVerifyOneTimePasswordAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        })
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
          autoSend: false,
        }),
      { wrapper }
    );

    await act(async () => {
      void result.current.send();
      void result.current.send();
    });

    expect(mockSendOneTimePasswordAction).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSend?.({
        data: {
          challengeId: 'challenge-1',
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 1_000).toISOString(),
        },
      });
    });

    act(() => {
      result.current.setCode('123456');
      result.current.setCode('123456');
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveVerify?.({
        data: {
          challengeId: 'challenge-1',
          verified: true,
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        },
      });
    });
  });

  it('behält bereits eingegebenen Code bei, wenn der Versand asynchron erfolgreich zurückkommt', async () => {
    let resolveSend:
      | ((value: {
          data: {
            challengeId: string;
            expiresAt: string;
            resendAvailableAt: string;
          };
        }) => void)
      | null = null;

    mockSendOneTimePasswordAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
          autoSend: false,
        }),
      { wrapper }
    );

    await act(async () => {
      void result.current.send();
    });

    act(() => {
      result.current.setCode('123');
    });

    await act(async () => {
      resolveSend?.({
        data: {
          challengeId: 'challenge-1',
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 1_000).toISOString(),
        },
      });
    });

    expect(result.current.code).toBe('123');
  });

  it('behält den aktuellen Status konsistent, wenn Verify mit späteren Statuswerten arbeitet', async () => {
    let resolveVerify:
      | ((value: {
          data: {
            challengeId: string;
            verified: true;
            expiresAt: string;
          };
        }) => void)
      | null = null;

    mockVerifyOneTimePasswordAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        })
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
          autoSend: false,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.send();
    });

    act(() => {
      result.current.setCode('123456');
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.resend();
    });

    await act(async () => {
      resolveVerify?.({
        data: {
          challengeId: 'challenge-1',
          verified: true,
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        },
      });
    });

    expect(result.current.challengeId).toBe('challenge-1');
    expect(result.current.isVerified).toBe(true);
  });

  it('setzt den Code nach einer fehlgeschlagenen Verifizierung zurück und zeigt die Fehlermeldung an', async () => {
    mockVerifyOneTimePasswordAction.mockResolvedValue({
      serverError: 'Ungültiger Code. Bitte versuchen Sie es erneut.',
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useOneTimePassword({
          email: 'david@example.com',
          autoSend: false,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.send();
    });

    act(() => {
      result.current.setCode('123456');
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalledWith({
        email: 'david@example.com',
        code: '123456',
      });
    });

    await waitFor(() => {
      expect(result.current.code).toBe('');
      expect(result.current.isVerified).toBe(false);
      expect(result.current.errorMessage).toBe(
        'Ungültiger Code. Bitte versuchen Sie es erneut.'
      );
    });
  });
});
