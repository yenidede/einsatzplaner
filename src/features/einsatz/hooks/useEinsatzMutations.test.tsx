/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import { StatusValuePairs } from '@/components/event-calendar/constants';
import { queryKeys } from '../queryKeys';
import {
  useCreateEinsatz,
  useToggleUserAssignment,
  useUpdateEinsatz,
} from './useEinsatzMutations';

const {
  mockCreateEinsatz,
  mockToggleUserAssignmentToEinsatz,
  mockShowDestructive,
  mockToastSuccess,
  mockToastError,
  mockGetEinsatzWithDetailsById,
  mockUpdateEinsatz,
} = vi.hoisted(() => ({
    mockCreateEinsatz: vi.fn(),
    mockToggleUserAssignmentToEinsatz: vi.fn(),
    mockShowDestructive: vi.fn(),
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
    showDestructive: mockShowDestructive,
  }),
}));

vi.mock('../dal-einsatz', () => ({
  createEinsatz: mockCreateEinsatz,
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
    mockCreateEinsatz.mockReset();
    mockToggleUserAssignmentToEinsatz.mockReset();
    mockShowDestructive.mockReset();
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

  it('verwendet beim Konflikt-Retry dieselbe Temp-ID und dupliziert den Optimistic Event nicht', async () => {
    let resolveRetry: (value: {
      conflicts: [];
      einsatz: {
        id: string;
        title: string;
        start: Date;
        end: Date;
      };
    }) => void = () => {};
    mockCreateEinsatz
      .mockResolvedValueOnce({
        conflicts: [
          {
            userName: 'Max Mustermann',
            conflictingEinsatz: {
              id: 'einsatz-2',
              title: 'Paralleltermin',
              start: '2026-04-04T08:00:00.000Z',
              end: '2026-04-04T09:00:00.000Z',
            },
          },
        ],
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          })
      );
    mockShowDestructive.mockResolvedValue('success');

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-04'), {
      events: [],
      detailedEinsaetze: [],
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEinsatz('org-1'), { wrapper });

    act(() => {
      result.current.mutate({
        title: 'Neuer Einsatz',
        start: new Date('2026-04-04T08:00:00.000Z'),
        end: new Date('2026-04-04T09:00:00.000Z'),
        all_day: false,
        org_id: 'org-1',
        created_by: 'user-1',
        assignedUsers: [],
        helpers_needed: 1,
        categories: [],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      expect(mockCreateEinsatz).toHaveBeenCalledTimes(2);
    });

    const calendarDataWhileRetryRuns = queryClient.getQueryData<{
      events: Array<{ id: string }>;
    }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));
    const calendarStateWhileRetryRuns = queryClient.getQueryState(
      queryKeys.einsaetzeForCalendar('org-1', '2026-04')
    );

    expect(calendarDataWhileRetryRuns?.events).toHaveLength(1);
    expect(calendarDataWhileRetryRuns?.events[0]?.id).toMatch(/^temp-/);
    expect(calendarStateWhileRetryRuns?.isInvalidated).toBe(false);

    await act(async () => {
      resolveRetry({
        conflicts: [],
        einsatz: {
          id: 'einsatz-1',
          title: 'Neuer Einsatz',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T09:00:00.000Z'),
        },
      });
    });
  });

  it('zeigt einen neuen Einsatz im Nachbarmonat sofort in der aktuellen Monatsansicht', async () => {
    let resolveCreate: (value: {
      conflicts: [];
      einsatz: {
        id: string;
        title: string;
        start: Date;
        end: Date;
      };
    }) => void = () => {};
    mockCreateEinsatz.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-04'), {
      events: [],
      detailedEinsaetze: [],
    });
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-05'), {
      events: [],
      detailedEinsaetze: [],
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEinsatz('org-1'), { wrapper });

    act(() => {
      result.current.mutate({
        title: 'Neuer Einsatz',
        start: new Date('2026-05-05T08:00:00.000Z'),
        end: new Date('2026-05-05T09:00:00.000Z'),
        all_day: false,
        org_id: 'org-1',
        created_by: 'user-1',
        assignedUsers: [],
        helpers_needed: 1,
        categories: [],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      const aprilData = queryClient.getQueryData<{
        events: Array<{ id: string; title: string; start: Date }>;
      }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));
      const mayData = queryClient.getQueryData<{
        events: Array<{ id: string; title: string; start: Date }>;
      }>(queryKeys.einsaetzeForCalendar('org-1', '2026-05'));

      expect(aprilData?.events).toHaveLength(1);
      expect(aprilData?.events[0]).toMatchObject({
        title: 'Neuer Einsatz',
        start: new Date('2026-05-05T08:00:00.000Z'),
      });
      expect(aprilData?.events[0]?.id).toMatch(/^temp-/);
      expect(mayData?.events).toHaveLength(1);
      expect(mayData?.events[0]?.id).toBe(aprilData?.events[0]?.id);
    });

    await act(async () => {
      resolveCreate({
        conflicts: [],
        einsatz: {
          id: 'einsatz-1',
          title: 'Neuer Einsatz',
          start: new Date('2026-05-05T08:00:00.000Z'),
          end: new Date('2026-05-05T09:00:00.000Z'),
        },
      });
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryState(
          queryKeys.einsaetzeForCalendar('org-1', '2026-04')
        )?.isInvalidated
      ).toBe(true);
      expect(
        queryClient.getQueryState(
          queryKeys.einsaetzeForCalendar('org-1', '2026-05')
        )?.isInvalidated
      ).toBe(true);
    });
  });

  it('rollt den ursprünglichen Cache zurück, wenn der Konflikt-Retry fehlschlägt', async () => {
    mockCreateEinsatz
      .mockResolvedValueOnce({
        conflicts: [
          {
            userName: 'Max Mustermann',
            conflictingEinsatz: {
              id: 'einsatz-2',
              title: 'Paralleltermin',
              start: '2026-04-04T08:00:00.000Z',
              end: '2026-04-04T09:00:00.000Z',
            },
          },
        ],
      })
      .mockRejectedValueOnce(new Error('Retry fehlgeschlagen'));
    mockShowDestructive.mockResolvedValue('success');

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-04'), {
      events: [
        {
          id: 'bestehend-1',
          title: 'Bestehender Einsatz',
          start: new Date('2026-04-04T07:00:00.000Z'),
          end: new Date('2026-04-04T08:00:00.000Z'),
          allDay: false,
          assignedUsers: [],
          helpersNeeded: 1,
        },
      ],
      detailedEinsaetze: [],
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateEinsatz('org-1'), { wrapper });

    act(() => {
      result.current.mutate({
        title: 'Neuer Einsatz',
        start: new Date('2026-04-04T08:00:00.000Z'),
        end: new Date('2026-04-04T09:00:00.000Z'),
        all_day: false,
        org_id: 'org-1',
        created_by: 'user-1',
        assignedUsers: [],
        helpers_needed: 1,
        categories: [],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      expect(mockCreateEinsatz).toHaveBeenCalledTimes(2);
      expect(mockToastError).toHaveBeenCalled();
    });

    const calendarData = queryClient.getQueryData<{
      events: Array<{ id: string }>;
    }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));

    expect(calendarData?.events.map((event) => event.id)).toEqual(['bestehend-1']);
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
    queryClient.setQueryData(queryKeys.categories('org-1'), [
      {
        id: 'cat-old',
        org_id: 'org-1',
        value: 'Alt',
        abbreviation: 'A',
      },
      {
        id: 'cat-new',
        org_id: 'org-1',
        value: 'Neu',
        abbreviation: 'N',
      },
    ]);
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
    queryClient.setQueryData(queryKeys.einsaetzeListPrefix(), {
      items: [{ id: 'einsatz-1', title: 'Alter Titel' }],
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
        categories: ['cat-new'],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      expect(mockGetEinsatzWithDetailsById).toHaveBeenCalledWith('einsatz-1');
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
      const listState = queryClient.getQueryState(queryKeys.einsaetzeListPrefix());

      expect(data?.title).toBe('Neuer Titel');
      expect(data?.isLocked).toBeUndefined();
      expect(listState?.isInvalidated).toBe(true);
    });
  });

  it('aktualisiert die Kalenderdarstellung beim Update sofort', async () => {
    let resolveUpdate: (value: {
      einsatz: {
        id: string;
        title: string;
        start: Date;
        end: Date;
      };
      conflicts: [];
    }) => void = () => {};

    mockUpdateEinsatz.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );
    mockGetEinsatzWithDetailsById.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
      title: 'Neuer Titel',
      start: new Date('2026-05-05T09:00:00.000Z'),
      end: new Date('2026-05-05T11:00:00.000Z'),
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

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.categories('org-1'), [
      {
        id: 'cat-old',
        org_id: 'org-1',
        value: 'Alt',
        abbreviation: 'A',
      },
      {
        id: 'cat-new',
        org_id: 'org-1',
        value: 'Neu',
        abbreviation: 'N',
      },
    ]);
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-04'), {
      events: [
        {
          id: 'einsatz-1',
          title: 'Alter Titel (A)',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T10:00:00.000Z'),
          allDay: false,
          assignedUsers: [],
          helpersNeeded: 1,
        },
      ],
      detailedEinsaetze: [],
    });
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-05'), {
      events: [
        {
          id: 'einsatz-1',
          title: 'Alter Titel (A)',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T10:00:00.000Z'),
          allDay: false,
          assignedUsers: [],
          helpersNeeded: 1,
        },
      ],
      detailedEinsaetze: [],
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
        start: new Date('2026-05-05T09:00:00.000Z'),
        end: new Date('2026-05-05T11:00:00.000Z'),
        org_id: 'org-1',
        created_by: 'user-1',
        helpers_needed: 2,
        status_id: StatusValuePairs.vergeben_bestaetigt,
        categories: ['cat-new'],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      const aprilData = queryClient.getQueryData<{
        events: Array<{
          title: string;
          start: Date;
          end: Date;
        }>;
      }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));

      expect(aprilData?.events).toHaveLength(1);
      expect(aprilData?.events[0]).toMatchObject({
        title: 'Neuer Titel (N)',
        start: new Date('2026-05-05T09:00:00.000Z'),
        end: new Date('2026-05-05T11:00:00.000Z'),
        status: {
          id: StatusValuePairs.vergeben_bestaetigt,
        },
      });
    });

    await waitFor(() => {
      const mayData = queryClient.getQueryData<{
        events: Array<{
          title: string;
          start: Date;
          end: Date;
        }>;
      }>(queryKeys.einsaetzeForCalendar('org-1', '2026-05'));

      expect(mayData?.events).toHaveLength(1);
      expect(mayData?.events[0]).toMatchObject({
        title: 'Neuer Titel (N)',
        start: new Date('2026-05-05T09:00:00.000Z'),
        end: new Date('2026-05-05T11:00:00.000Z'),
        status: {
          id: StatusValuePairs.vergeben_bestaetigt,
        },
      });
    });

    await act(async () => {
      resolveUpdate({
        einsatz: {
          id: 'einsatz-1',
          title: 'Neuer Titel',
          start: new Date('2026-05-05T09:00:00.000Z'),
          end: new Date('2026-05-05T11:00:00.000Z'),
        },
        conflicts: [],
      });
    });
  });

  it('behält den optimistischen Status während eines bestätigten Konflikt-Retry bei', async () => {
    let resolveRetry: (value: {
      einsatz: {
        id: string;
        title: string;
        start: Date;
        end: Date;
      };
      conflicts: [];
    }) => void = () => {};

    mockUpdateEinsatz
      .mockResolvedValueOnce({
        conflicts: [
          {
            userName: 'Max Mustermann',
            conflictingEinsatz: {
              id: 'einsatz-2',
              title: 'Paralleltermin',
              start: '2026-04-04T08:00:00.000Z',
              end: '2026-04-04T09:00:00.000Z',
            },
          },
        ],
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve;
          })
      );
    mockShowDestructive.mockResolvedValue('success');

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.categories('org-1'), []);
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-04'), {
      events: [
        {
          id: 'einsatz-1',
          title: 'Alter Titel',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T10:00:00.000Z'),
          allDay: false,
          assignedUsers: [],
          helpersNeeded: 1,
          status: {
            id: StatusValuePairs.offen,
            verwalter_text: 'offen',
            helper_text: 'offen',
            verwalter_color: 'red',
            helper_color: 'lime',
          },
        },
      ],
      detailedEinsaetze: [],
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
        title: 'Alter Titel',
        start: new Date('2026-04-04T08:00:00.000Z'),
        end: new Date('2026-04-04T10:00:00.000Z'),
        org_id: 'org-1',
        created_by: 'user-1',
        helpers_needed: 1,
        status_id: StatusValuePairs.vergeben_bestaetigt,
        categories: [],
        einsatz_fields: [],
      });
    });

    await waitFor(() => {
      expect(mockUpdateEinsatz).toHaveBeenCalledTimes(2);
    });

    const calendarDataWhileRetryRuns = queryClient.getQueryData<{
      events: Array<{ status?: { id: string } }>;
    }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'));
    const calendarStateWhileRetryRuns = queryClient.getQueryState(
      queryKeys.einsaetzeForCalendar('org-1', '2026-04')
    );

    expect(calendarDataWhileRetryRuns?.events[0]?.status?.id).toBe(
      StatusValuePairs.vergeben_bestaetigt
    );
    expect(calendarStateWhileRetryRuns?.isInvalidated).toBe(false);

    await act(async () => {
      resolveRetry({
        einsatz: {
          id: 'einsatz-1',
          title: 'Alter Titel',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T10:00:00.000Z'),
        },
        conflicts: [],
      });
    });
  });

  it('hebt Kalender-Locks auch ohne gespeicherten Detailcache nach einem Fehler wieder auf', async () => {
    let rejectUpdate: (reason?: unknown) => void = () => {};
    mockUpdateEinsatz.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectUpdate = reject;
        })
    );

    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.einsaetzeForCalendar('org-1', '2026-04'), {
      events: [],
      detailedEinsaetze: [
        {
          id: 'einsatz-1',
          title: 'Alter Titel',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T10:00:00.000Z'),
          isLocked: false,
        },
      ],
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
          detailedEinsaetze: Array<{ isLocked?: boolean }>;
        }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'))?.detailedEinsaetze[0]
          ?.isLocked
      ).toBe(true);
    });

    rejectUpdate(new Error('Speicherfehler'));

    await waitFor(() => {
      expect(
        queryClient.getQueryData<{
          detailedEinsaetze: Array<{ isLocked?: boolean }>;
        }>(queryKeys.einsaetzeForCalendar('org-1', '2026-04'))?.detailedEinsaetze[0]
          ?.isLocked
      ).toBe(false);
    });
  });
});
