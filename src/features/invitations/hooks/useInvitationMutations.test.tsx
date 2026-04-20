/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAcceptInvitation } from './useInvitationMutations';

const {
  mockPush,
  mockUpdateSession,
  mockAcceptInvitationAction,
  mockSessionData,
  mockToastError,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockAcceptInvitationAction: vi.fn(),
  mockToastError: vi.fn(),
  mockSessionData: {
    user: {
      id: 'user-1',
      email: 'max@example.com',
      firstname: 'Max',
      lastname: 'Mustermann',
    },
  } as { user?: Record<string, unknown> } | null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSessionData,
    update: mockUpdateSession,
  }),
}));

vi.mock('../invitation-action', () => ({
  acceptInvitationAction: mockAcceptInvitationAction,
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAcceptInvitation', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUpdateSession.mockReset();
    mockAcceptInvitationAction.mockReset();
    mockToastError.mockReset();
    mockSessionData.user = {
      id: 'user-1',
      email: 'max@example.com',
      firstname: 'Max',
      lastname: 'Mustermann',
    };
  });

  it('aktualisiert die Session und leitet bei erfolgreicher Annahme weiter', async () => {
    mockAcceptInvitationAction.mockResolvedValue({
      success: true,
      message: 'Einladung erfolgreich angenommen',
      sessionUpdate: {
        user: {
          id: 'user-1',
          email: 'max@example.com',
          firstname: 'Max',
          lastname: 'Mustermann',
          orgIds: ['org-1', 'org-2'],
          roleIds: ['role-1'],
          activeOrganization: {
            id: 'org-2',
            name: 'Neue Organisation',
            logo_url: null,
          },
        },
      },
    });

    const { result } = renderHook(() => useAcceptInvitation('token-123'), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(mockAcceptInvitationAction).toHaveBeenCalledWith('token-123');
      expect(mockUpdateSession).toHaveBeenCalledWith({
        user: {
          id: 'user-1',
          email: 'max@example.com',
          firstname: 'Max',
          lastname: 'Mustermann',
          orgIds: ['org-1', 'org-2'],
          roleIds: ['role-1'],
          activeOrganization: {
            id: 'org-2',
            name: 'Neue Organisation',
            logo_url: null,
          },
        },
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('leitet auch ohne Session-Benutzer weiter, ohne Session-Update auszuführen', async () => {
    mockSessionData.user = undefined;
    mockAcceptInvitationAction.mockResolvedValue({
      success: true,
      message: 'Einladung erfolgreich angenommen',
    });

    const { result } = renderHook(() => useAcceptInvitation('token-123'), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(mockUpdateSession).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('leitet auch bei fehlgeschlagenem Session-Update weiter und zeigt Fehlermeldung', async () => {
    mockAcceptInvitationAction.mockResolvedValue({
      success: true,
      message: 'Einladung erfolgreich angenommen',
      sessionUpdate: {
        user: {
          id: 'user-1',
          email: 'max@example.com',
          firstname: 'Max',
          lastname: 'Mustermann',
          orgIds: ['org-2'],
          roleIds: ['role-1'],
          activeOrganization: {
            id: 'org-2',
            name: 'Neue Organisation',
            logo_url: null,
          },
        },
      },
    });
    mockUpdateSession.mockRejectedValue(new Error('Session-Update fehlgeschlagen'));

    const { result } = renderHook(() => useAcceptInvitation('token-123'), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('ruft den Fehler-Callback auf, wenn die Annahme fehlschlägt', async () => {
    const onError = vi.fn();
    const testError = new Error('Fehler beim Annehmen');
    mockAcceptInvitationAction.mockRejectedValue(testError);

    const { result } = renderHook(
      () => useAcceptInvitation('token-123', onError),
      {
        wrapper: createWrapper(),
      }
    );

    await expect(result.current.mutateAsync()).rejects.toThrow(
      'Fehler beim Annehmen'
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(testError);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
