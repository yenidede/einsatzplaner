import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAuth,
  mockHasPermission,
  mockGetUserRolesInOrganization,
  mockFindMany,
  mockFindUnique,
  mockCreate,
  mockUpdate,
  mockDelete,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockHasPermission: vi.fn(),
  mockGetUserRolesInOrganization: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/auth/authGuard', () => ({
  requireAuth: mockRequireAuth,
  hasPermission: mockHasPermission,
}));

vi.mock('@/DataAccessLayer/user', () => ({
  getUserRolesInOrganization: mockGetUserRolesInOrganization,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    analytics_chart: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

import {
  createAnalyticsChart,
  deleteAnalyticsChart,
  getAnalyticsChartsByOrgId,
  updateAnalyticsChart,
} from './analytics-dal';

describe('analytics dal', () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockHasPermission.mockReset();
    mockGetUserRolesInOrganization.mockReset();
    mockFindMany.mockReset();
    mockFindUnique.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();

    mockRequireAuth.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
          activeOrganization: { id: 'org-1' },
        },
      },
    });
    mockHasPermission.mockResolvedValue(true);
    mockGetUserRolesInOrganization.mockResolvedValue([
      { role: { name: 'Einsatzverwaltung', abbreviation: 'EV' } },
    ]);
  });

  it('markiert fremde Diagramme für EV nicht als löschbar', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'chart-1',
        org_id: 'org-1',
        created_by: 'user-2',
        title: 'Test',
        description: null,
        chart_type: 'bar',
        dataset: 'einsatz',
        dimension_kind: 'static',
        dimension_key: 'status',
        metric_aggregation: 'group_count',
        metric_key: 'value',
        filters_json: { timeframe: { preset: 'all', from: null, to: null } },
        display_json: {
          dimensionLabel: 'Status',
          dimensionDatatype: 'select',
        },
        created_at: new Date('2026-04-10T10:00:00.000Z'),
        updated_at: new Date('2026-04-10T10:00:00.000Z'),
        user: null,
      },
    ]);

    const result = await getAnalyticsChartsByOrgId('org-1');

    expect(result[0]?.canDelete).toBe(false);
  });

  it('ordnet benutzerdefinierte Diagramme beim Laden wieder als custom ein', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'chart-1',
        org_id: 'org-1',
        created_by: 'user-2',
        title: 'Test',
        description: null,
        chart_type: 'bar',
        dataset: 'einsatz',
        dimension_kind: 'standard',
        dimension_key: 'custom_field',
        metric_aggregation: 'group_count',
        metric_key: 'value',
        filters_json: { timeframe: { preset: 'all', from: null, to: null } },
        display_json: {
          dimensionLabel: 'Eigenes Feld',
          dimensionDatatype: 'text',
          storedDimensionKind: 'user_property',
        },
        created_at: new Date('2026-04-10T10:00:00.000Z'),
        updated_at: new Date('2026-04-10T10:00:00.000Z'),
        user: null,
      },
    ]);

    const result = await getAnalyticsChartsByOrgId('org-1');

    expect(result[0]?.dimensionKind).toBe('custom');
  });

  it('fällt bei älteren Datensätzen auf dimension_kind zurück', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'chart-1',
        org_id: 'org-1',
        created_by: 'user-2',
        title: 'Test',
        description: null,
        chart_type: 'bar',
        dataset: 'einsatz',
        dimension_kind: 'user_property',
        dimension_key: 'custom_field',
        metric_aggregation: 'group_count',
        metric_key: 'value',
        filters_json: { timeframe: { preset: 'all', from: null, to: null } },
        display_json: {
          dimensionLabel: 'Eigenes Feld',
          dimensionDatatype: 'text',
        },
        created_at: new Date('2026-04-10T10:00:00.000Z'),
        updated_at: new Date('2026-04-10T10:00:00.000Z'),
        user: null,
      },
    ]);

    const result = await getAnalyticsChartsByOrgId('org-1');

    expect(result[0]?.dimensionKind).toBe('custom');
  });

  it('verhindert das Löschen fremder Diagramme für EV', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'chart-1',
      org_id: 'org-1',
      created_by: 'user-2',
      dataset: 'einsatz',
    });

    await expect(deleteAnalyticsChart('chart-1')).rejects.toThrow(
      'Sie können nur Ihre eigenen Diagramme löschen.'
    );

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('erlaubt Superadmin das Löschen fremder Diagramme', async () => {
    mockGetUserRolesInOrganization.mockResolvedValue([
      { role: { name: 'Superadmin', abbreviation: null } },
    ]);
    mockFindUnique.mockResolvedValue({
      id: 'chart-1',
      org_id: 'org-1',
      created_by: 'user-2',
      dataset: 'einsatz',
    });

    await deleteAnalyticsChart('chart-1');

    expect(mockDelete).toHaveBeenCalledWith({
      where: {
        id: 'chart-1',
      },
    });
  });

  it('validiert benutzerdefinierte Zeiträume vor dem Speichern', async () => {
    await expect(
      createAnalyticsChart('org-1', {
        title: 'Eigenes Feld',
        description: null,
        chartType: 'bar',
        dimensionKind: 'custom',
        dimensionKey: 'custom_field',
        metricAggregation: 'group_count',
        filters: {
          timeframe: {
            preset: 'custom',
            from: '2026-04-01',
            to: 'not-a-date',
          },
        },
        display: {
          dimensionLabel: 'Eigenes Feld',
          dimensionDatatype: 'text',
        },
      })
    ).rejects.toThrow('Bitte wählen Sie einen gültigen benutzerdefinierten Zeitraum.');

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('trimmt die Dimension beim Speichern und erkennt start_day korrekt', async () => {
    mockCreate.mockResolvedValue({
      id: 'chart-1',
      org_id: 'org-1',
      created_by: 'user-1',
      title: 'Tage',
      description: null,
      chart_type: 'bar',
      dataset: 'einsatz',
      dimension_kind: 'time',
      dimension_key: 'start_day',
      metric_aggregation: 'count',
      metric_key: 'value',
      filters_json: { timeframe: { preset: 'all', from: null, to: null } },
      display_json: {
        dimensionLabel: 'Auswertung',
        dimensionDatatype: 'date',
        visualChartType: 'bar',
        storedDimensionKind: 'time',
      },
      created_at: new Date('2026-04-10T10:00:00.000Z'),
      updated_at: new Date('2026-04-10T10:00:00.000Z'),
      user: null,
    });

    await createAnalyticsChart('org-1', {
      title: 'Tage',
      description: null,
      chartType: 'bar',
      dimensionKind: 'static',
      dimensionKey: ' start_day ',
      metricAggregation: 'group_count',
      filters: {
        timeframe: {
          preset: 'all',
          from: null,
          to: null,
        },
      },
      display: {
        dimensionLabel: 'Auswertung',
        dimensionDatatype: 'date',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dimension_key: 'start_day',
          dimension_kind: 'time',
        }),
      })
    );
  });

  it('verhindert Änderungen an Charts aus anderen Datensätzen', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'chart-1',
      org_id: 'org-1',
      dataset: 'other',
    });

    await expect(
      updateAnalyticsChart('chart-1', {
        title: 'Eigenes Feld',
        description: null,
        chartType: 'bar',
        dimensionKind: 'custom',
        dimensionKey: 'custom_field',
        metricAggregation: 'group_count',
        filters: {
          timeframe: {
            preset: 'all',
            from: null,
            to: null,
          },
        },
        display: {
          dimensionLabel: 'Eigenes Feld',
          dimensionDatatype: 'text',
        },
      })
    ).rejects.toThrow('Diagramm nicht gefunden.');

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('verhindert das Löschen von Charts aus anderen Datensätzen', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'chart-1',
      org_id: 'org-1',
      created_by: 'user-2',
      dataset: 'other',
    });

    await expect(deleteAnalyticsChart('chart-1')).rejects.toThrow(
      'Diagramm nicht gefunden.'
    );

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('speichert benutzerdefinierte Diagramme als user_property', async () => {
    mockCreate.mockResolvedValue({
      id: 'chart-1',
      org_id: 'org-1',
      created_by: 'user-1',
      title: 'Eigenes Feld',
      description: null,
      chart_type: 'bar',
      dataset: 'einsatz',
      dimension_kind: 'user_property',
      dimension_key: 'custom_field',
      metric_aggregation: 'count',
      metric_key: 'value',
      filters_json: { timeframe: { preset: 'all', from: null, to: null } },
      display_json: {
        dimensionLabel: 'Eigenes Feld',
        dimensionDatatype: 'text',
        visualChartType: 'bar',
        storedDimensionKind: 'user_property',
      },
      created_at: new Date('2026-04-10T10:00:00.000Z'),
      updated_at: new Date('2026-04-10T10:00:00.000Z'),
      user: null,
    });

    const result = await createAnalyticsChart('org-1', {
      title: 'Eigenes Feld',
      description: null,
      chartType: 'bar',
      dimensionKind: 'custom',
      dimensionKey: 'custom_field',
      metricAggregation: 'group_count',
      filters: {
        timeframe: {
          preset: 'all',
          from: null,
          to: null,
        },
      },
      display: {
        dimensionLabel: 'Eigenes Feld',
        dimensionDatatype: 'text',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dimension_kind: 'user_property',
          display_json: expect.objectContaining({
            storedDimensionKind: 'user_property',
          }),
        }),
      })
    );
    expect(result.dimensionKind).toBe('custom');
  });
});
