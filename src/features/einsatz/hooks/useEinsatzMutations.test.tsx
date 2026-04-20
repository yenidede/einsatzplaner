/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { queryKeys } from '../queryKeys';
import {
  useToggleUserAssignment,
  useUpdateEinsatz,
} from './useEinsatzMutations';

const {
  mockToggleUserAssignmentToEinsatz,
  mockToastSuccess,
  mockToastError,
  mockGetEinsatzWithDetailsById,
  mockUpdateEinsatz,
} = vi.hoisted(() => ({
    mockToggleUserAssignmentToEinsatz: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockGetEinsatzWithDetailsById: vi.fn(),
    mockUpdateEinsatz: vi.fn(),
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
  updateEinsatz: mockUpdateEinsatz,
  updateEinsatzTime: vi.fn(),
  updateEinsatzStatus: vi.fn(),
  deleteEinsatzById: vi.fn(),
  deleteEinsaetzeByIds: vi.fn(),
  getEinsatzWithDetailsById: mockGetEinsatzWithDetailsById,
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
    mockGetEinsatzWithDetailsById.mockReset();
    mockUpdateEinsatz.mockReset();
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

  it('entfernt den Benutzer bei unassign nicht optimistisch aus dem Cache', async () => {
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

      expect(data?.events[0]?.assignedUsers).toEqual(['user-1']);
    });
  });

  it('schreibt nach einem Update den frischen Detail-Datensatz in den Cache', async () => {
    mockUpdateEinsatz.mockResolvedValue({
      einsatz: {
        id: 'einsatz-1',
        title: 'Neuer Titel',
        start: new Date('2026-04-04T09:00:00.000Z'),
        end: new Date('2026-04-04T11:00:00.000Z'),
      },
      conflicts: [],
    });

    let resolveDetailedFetch: (
      value: Record<string, unknown>
    ) => void = () => {};
    const detailedFetch = new Promise<Record<string, unknown>>((resolve) => {
      resolveDetailedFetch = resolve;
    });
    mockGetEinsatzWithDetailsById.mockReturnValueOnce(detailedFetch);

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.detailedEinsatz('einsatz-1'), {
      id: 'einsatz-1',
      org_id: 'org-1',
      title: 'Alter Titel',
      start: new Date('2026-04-04T08:00:00.000Z'),
      end: new Date('2026-04-04T10:00:00.000Z'),
      all_day: false,
      created_by: 'user-1',
      helpers_needed: 1,
      participant_count: null,
      price_per_person: null,
      total_price: null,
      template_id: null,
      status_id: 'offen',
      anmerkung: null,
      created_at: new Date('2026-04-01T10:00:00.000Z'),
      updated_at: new Date('2026-04-04T08:00:00.000Z'),
      einsatz_status: {
        id: 'offen',
        verwalter_text: 'offen',
        helper_text: 'offen',
        verwalter_color: 'gray',
        helper_color: 'gray',
      },
      assigned_users: [],
      einsatz_fields: [],
      categories: [],
      change_log: [],
      user_properties: [],
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useUpdateEinsatz('org-1', 'Einsatz'),
      { wrapper }
    );

    act(() => {
      result.current.mutate({
        id: 'einsatz-1',
        title: 'Neuer Titel',
        start: new Date('2026-04-04T09:00:00.000Z'),
        end: new Date('2026-04-04T11:00:00.000Z'),
        org_id: 'org-1',
        created_by: 'user-1',
        helpers_needed: 2,
        categories: [],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<{
          isLocked?: boolean;
        }>(queryKeys.detailedEinsatz('einsatz-1'))?.isLocked
      ).toBe(true);
    });

    resolveDetailedFetch({
      id: 'einsatz-1',
      org_id: 'org-1',
      title: 'Neuer Titel',
      start: new Date('2026-04-04T09:00:00.000Z'),
      end: new Date('2026-04-04T11:00:00.000Z'),
      all_day: false,
      created_by: 'user-1',
      helpers_needed: 2,
      participant_count: null,
      price_per_person: null,
      total_price: null,
      template_id: null,
      status_id: 'offen',
      anmerkung: null,
      created_at: new Date('2026-04-01T10:00:00.000Z'),
      updated_at: new Date('2026-04-04T08:30:00.000Z'),
      einsatz_status: {
        id: 'offen',
        verwalter_text: 'offen',
        helper_text: 'offen',
        verwalter_color: 'gray',
        helper_color: 'gray',
      },
      assigned_users: ['user-1'],
      einsatz_fields: [],
      categories: [],
      change_log: [],
      user_properties: [],
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        title: string;
        start: Date;
        isLocked?: boolean;
      }>(queryKeys.detailedEinsatz('einsatz-1'));

      expect(data?.title).toBe('Neuer Titel');
      expect(data?.isLocked).toBeUndefined();
    });
  });
});
