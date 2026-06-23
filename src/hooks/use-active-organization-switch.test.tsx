/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveOrganizationSwitch } from './use-active-organization-switch';

const {
  mockPush,
  mockUpdateSession,
  mockToastSuccess,
  mockToastError,
  mockUpdateActiveOrganizationAction,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockUpdateActiveOrganizationAction: vi.fn(),
}));

let mockPathname = '/settings/user';
let mockSessionData = {
  user: {
    id: 'user-1',
    firstname: 'Max',
    lastname: 'Mustermann',
    activeOrganization: {
      id: 'org-1',
      name: 'Aktiver Verein',
      logo_url: null,
    },
  },
};

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
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

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/features/settings/settings-action', () => ({
  updateActiveOrganizationAction: mockUpdateActiveOrganizationAction,
}));

describe('useActiveOrganizationSwitch', () => {
  beforeEach(() => {
    mockPathname = '/settings/user';
    mockSessionData = {
      user: {
        id: 'user-1',
        firstname: 'Max',
        lastname: 'Mustermann',
        activeOrganization: {
          id: 'org-1',
          name: 'Aktiver Verein',
          logo_url: null,
        },
      },
    };

    mockPush.mockReset();
    mockUpdateSession.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockUpdateActiveOrganizationAction.mockReset();
  });

  it('aktualisiert Session und Route nach erfolgreichem Wechsel in den Einstellungen', async () => {
    mockPathname = '/settings/org/org-1';
    mockUpdateActiveOrganizationAction.mockResolvedValue({
      success: true,
      organization: {
        id: 'org-2',
        name: 'Neuer Verein',
        logo_url: 'logo.png',
      },
    });

    const { result } = renderHook(() => useActiveOrganizationSwitch());

    await result.current.switchOrganization('org-2');

    expect(mockUpdateActiveOrganizationAction).toHaveBeenCalledWith('org-2');
    expect(mockUpdateSession).toHaveBeenCalledWith({
      user: {
        ...mockSessionData.user,
        activeOrganization: {
          id: 'org-2',
          name: 'Neuer Verein',
          logo_url: 'logo.png',
        },
      },
    });
    expect(mockPush).toHaveBeenCalledWith('/settings/org/org-2');
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Organisation erfolgreich zu Neuer Verein gewechselt.'
    );
  });

  it('zeigt einen Fehler an und aktualisiert weder Session noch Route bei fehlgeschlagenem Wechsel', async () => {
    mockUpdateActiveOrganizationAction.mockResolvedValue({
      success: false,
      error: 'Kein Zugriff auf diese Organisation',
    });

    const { result } = renderHook(() => useActiveOrganizationSwitch());

    await result.current.switchOrganization('org-2');

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Fehler beim Wechseln der Organisation: Kein Zugriff auf diese Organisation'
      );
    });

    expect(mockUpdateSession).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(result.current.isSwitching).toBe(false);
  });

  it('fuehrt von der Expired-Route nach erfolgreichem Wechsel zur Hauptansicht zurueck', async () => {
    mockPathname = '/subscription-expired';
    mockUpdateActiveOrganizationAction.mockResolvedValue({
      success: true,
      organization: {
        id: 'org-2',
        name: 'Neuer Verein',
        logo_url: 'logo.png',
      },
    });

    const { result } = renderHook(() => useActiveOrganizationSwitch());

    await result.current.switchOrganization('org-2');

    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Organisation erfolgreich zu Neuer Verein gewechselt.'
    );
  });
});
