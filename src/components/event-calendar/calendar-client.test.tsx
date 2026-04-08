/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Component from './calendar-client';

const {
  mockToggleUserAssignmentToEinsatz,
  mockToastSuccess,
  mockToastError,
  mockAssignedUsers,
} = vi.hoisted(() => ({
  mockToggleUserAssignmentToEinsatz: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockAssignedUsers: [] as string[],
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        orgIds: ['org-1'],
        activeOrganization: { id: 'org-1' },
      },
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/hooks/use-confirm-dialog', () => ({
  useConfirmDialog: () => ({
    showDefault: vi.fn(),
    showDestructive: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-organization-terminology', () => ({
  useOrganizationTerminology: () => ({
    einsatz_singular: 'Einsatz',
    einsatz_plural: 'Einsaetze',
  }),
}));

vi.mock('@/contexts/EventDialogContext', () => ({
  useEventDialogFromContext: () => ({
    selectedEinsatz: 'einsatz-1',
    setEinsatz: vi.fn(),
  }),
}));

vi.mock('@/features/organization/hooks/use-organization-queries', () => ({
  useOrganizations: () => ({ data: [] }),
}));

vi.mock('@/features/user_properties/hooks/use-user-property-queries', () => ({
  useUserPropertiesByOrg: () => ({ data: [] }),
}));

vi.mock('@/features/user/hooks/use-user-queries', () => ({
  useUsersByOrgIds: () => ({ data: [] }),
}));

vi.mock('@/features/einsatz/hooks/useEinsatzQueries', () => ({
  useEinsaetzeForCalendar: () => ({
    data: {
      events: [
        {
          id: 'einsatz-1',
          assignedUsers: mockAssignedUsers,
        },
      ],
      detailedEinsaetze: [
        {
          id: 'einsatz-1',
          title: 'Testeinsatz',
          user_properties: [],
          helpers_needed: 1,
        },
      ],
    },
    isError: false,
    error: null,
    isLoading: false,
  }),
  usePrefetchEinsaetzeForCalendar: () => vi.fn(),
  useDetailedEinsatz: () => ({
    data: undefined,
    error: null,
    isError: false,
  }),
}));

vi.mock('@/features/einsatz/dal-einsatz', () => ({
  createEinsatz: vi.fn(),
  updateEinsatz: vi.fn(),
  updateEinsatzTime: vi.fn(),
  updateEinsatzStatus: vi.fn(),
  deleteEinsatzById: vi.fn(),
  deleteEinsaetzeByIds: vi.fn(),
  toggleUserAssignmentToEinsatz: mockToggleUserAssignmentToEinsatz,
}));

vi.mock('@/components/event-calendar', () => ({
  EventCalendar: ({
    onAssignToggleEvent,
  }: {
    onAssignToggleEvent: (eventId: string) => void;
  }) => (
    <button onClick={() => onAssignToggleEvent('einsatz-1')}>Eintragen</button>
  ),
}));

vi.mock('@/features/einsatz/hooks/useEinsatzMutations', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/einsatz/hooks/useEinsatzMutations')
  >('@/features/einsatz/hooks/useEinsatzMutations');

  return {
    ...actual,
    useCreateEinsatz: () => ({ mutate: vi.fn() }),
    useUpdateEinsatz: () => ({ mutate: vi.fn() }),
    useConfirmEinsatz: () => ({ mutate: vi.fn() }),
    useDeleteEinsatz: () => ({ mutate: vi.fn() }),
    useDeleteMultipleEinsaetze: () => ({
      mutateAsync: vi.fn(),
    }),
  };
});

describe('calendar-client Selbstzuweisung', () => {
  beforeEach(() => {
    mockToggleUserAssignmentToEinsatz.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockAssignedUsers.splice(0, mockAssignedUsers.length);
    mockToggleUserAssignmentToEinsatz.mockResolvedValue({
      id: 'einsatz-1',
      title: 'Testeinsatz',
      start: '2026-04-04T08:00:00.000Z',
    });
  });

  it('loest bei einer Selbstzuweisung genau eine Mutation und genau einen Success-Toast aus', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Component mode="helper" />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eintragen' }));

    await waitFor(() => {
      expect(mockToggleUserAssignmentToEinsatz).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    });

    expect(mockToggleUserAssignmentToEinsatz).toHaveBeenCalledWith(
      'einsatz-1',
      'assign'
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Sie haben sich erfolgreich bei 'Testeinsatz' eingetragen"
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('nutzt bei einer Selbst-Abmeldung genau eine Austragen-Mutation und den korrekten Success-Toast', async () => {
    mockAssignedUsers.push('user-1');

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Component mode="helper" />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eintragen' }));

    await waitFor(() => {
      expect(mockToggleUserAssignmentToEinsatz).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    });

    expect(mockToggleUserAssignmentToEinsatz).toHaveBeenCalledWith(
      'einsatz-1',
      'unassign'
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Sie haben sich erfolgreich von Testeinsatz ausgetragen'
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
