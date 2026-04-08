/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '../queryKeys';
import { useToggleUserAssignment } from './useEinsatzMutations';

const { mockToggleUserAssignmentToEinsatz, mockToastSuccess, mockToastError } =
  vi.hoisted(() => ({
    mockToggleUserAssignmentToEinsatz: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
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

vi.mock('../dal-einsatz', () => ({
  createEinsatz: vi.fn(),
  updateEinsatz: vi.fn(),
  updateEinsatzTime: vi.fn(),
  updateEinsatzStatus: vi.fn(),
  deleteEinsatzById: vi.fn(),
  deleteEinsaetzeByIds: vi.fn(),
  toggleUserAssignmentToEinsatz: mockToggleUserAssignmentToEinsatz,
}));

describe('useToggleUserAssignment', () => {
  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  beforeEach(() => {
    mockToggleUserAssignmentToEinsatz.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockToggleUserAssignmentToEinsatz.mockResolvedValue({
      id: 'einsatz-1',
      title: 'Testeinsatz',
      start: '2026-04-04T08:00:00.000Z',
    });
  });

  it('entfernt den Benutzer bei einem zweiten assign-Intent nicht optimistisch aus dem Cache', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      queryKeys.einsaetzeForCalendar('org-1', '2026-04'),
      {
        events: [
          {
            id: 'einsatz-1',
            title: 'Testeinsatz',
            start: new Date('2026-04-04T08:00:00.000Z'),
            end: new Date('2026-04-04T10:00:00.000Z'),
            assignedUsers: ['user-1'],
          },
        ],
        detailedEinsaetze: [],
      }
    );

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useToggleUserAssignment('org-1', 'user-1'),
      { wrapper }
    );

    result.current.mutate({ eventId: 'einsatz-1', intent: 'assign' });

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        events: Array<{ assignedUsers: string[] }>;
      }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));

      expect(data?.events[0]?.assignedUsers).toEqual(['user-1']);
    });
  });

  it('entfernt den Benutzer bei unassign optimistisch aus dem Cache', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      queryKeys.einsaetzeForCalendar('org-1', '2026-04'),
      {
        events: [
          {
            id: 'einsatz-1',
            title: 'Testeinsatz',
            start: new Date('2026-04-04T08:00:00.000Z'),
            end: new Date('2026-04-04T10:00:00.000Z'),
            assignedUsers: ['user-1'],
          },
        ],
        detailedEinsaetze: [],
      }
    );

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useToggleUserAssignment('org-1', 'user-1'),
      { wrapper }
    );

    result.current.mutate({ eventId: 'einsatz-1', intent: 'unassign' });

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        events: Array<{ assignedUsers: string[] }>;
      }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));

      expect(data?.events[0]?.assignedUsers).toEqual([]);
    });
  });
});
