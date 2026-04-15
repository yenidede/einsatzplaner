import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsChartAggregation,
  getDefaultAnalyticsFilters,
  getTimeframeLabel,
  isEinsatzWithinAnalyticsFilter,
} from './analytics-utils';
import type { AnalyticsChartRecord } from './types';
import type { EinsatzListItem } from '@/features/einsatz/types';

function createChart(
  overrides: Partial<AnalyticsChartRecord> = {}
): AnalyticsChartRecord {
  return {
    id: 'chart-1',
    orgId: 'org-1',
    createdBy: 'user-1',
    createdByName: 'Max Mustermann',
    title: 'Statusauswertung',
    description: null,
    chartType: 'bar',
    dataset: 'einsatz',
    dimensionKind: 'static',
    dimensionKey: 'status',
    metricAggregation: 'group_count',
    metricKey: 'value',
    filters: getDefaultAnalyticsFilters(),
    display: {
      dimensionLabel: 'Status',
      dimensionDatatype: 'select',
    },
    createdAt: new Date('2026-04-10T10:00:00.000Z'),
    updatedAt: new Date('2026-04-10T10:00:00.000Z'),
    canEdit: true,
    canDelete: true,
    ...overrides,
  };
}

function createRow(overrides: Partial<EinsatzListItem> = {}): EinsatzListItem {
  return {
    id: 'einsatz-1',
    created_at: new Date('2026-04-10T10:00:00.000Z'),
    updated_at: new Date('2026-04-10T10:00:00.000Z'),
    title: 'Einsatz',
    start: new Date('2026-04-10T10:00:00.000Z'),
    end: new Date('2026-04-10T12:00:00.000Z'),
    participant_count: 10,
    price_per_person: null,
    total_price: null,
    org_id: 'org-1',
    created_by: 'user-1',
    template_id: 'template-1',
    all_day: false,
    helpers_needed: 6,
    status_id: 'status-1',
    anmerkung: null,
    organization_name: 'Testverein',
    created_by_name: 'Max Mustermann',
    template_name: 'Vorlage A',
    status_verwalter_text: 'Offen',
    status_helper_text: 'Offen',
    status_verwalter_color: '#000000',
    status_helper_color: '#000000',
    category_labels: ['Musik'],
    category_display: 'Musik',
    helper_names: ['Lisa'],
    helper_display: 'Lisa',
    helper_count: 4,
    custom_fields: {},
    custom_field_meta: [],
    ...overrides,
  };
}

describe('analytics utils', () => {
  it('aggregiert Gruppen pro Status', () => {
    const chart = createChart();
    const result = buildAnalyticsChartAggregation(chart, [
      createRow({ id: 'e1', status_verwalter_text: 'Offen' }),
      createRow({ id: 'e2', status_verwalter_text: 'Offen' }),
      createRow({ id: 'e3', status_verwalter_text: 'Bestätigt' }),
    ]);

    expect(result.rows).toEqual([
      expect.objectContaining({ label: 'Bestätigt', value: 1 }),
      expect.objectContaining({ label: 'Offen', value: 2 }),
    ]);
  });

  it('summiert Teilnehmende pro Kategorie mehrfach bei Mehrfachkategorien', () => {
    const chart = createChart({
      dimensionKey: 'categories',
      display: {
        dimensionLabel: 'Kategorien',
        dimensionDatatype: 'multi-select',
      },
      metricAggregation: 'participant_sum',
    });
    const result = buildAnalyticsChartAggregation(chart, [
      createRow({
        id: 'e1',
        participant_count: 12,
        category_labels: ['Musik', 'Theater'],
      }),
    ]);

    expect(result.rows).toEqual([
      expect.objectContaining({ label: 'Musik', value: 12 }),
      expect.objectContaining({ label: 'Theater', value: 12 }),
    ]);
  });

  it('bucketiert numerische Felder auf maximal zehn Bereiche', () => {
    const chart = createChart({
      dimensionKey: 'helpers_needed',
      display: {
        dimensionLabel: 'Anzahl benötigte Helfer',
        dimensionDatatype: 'number',
      },
    });

    const rows = Array.from({ length: 12 }).map((_, index) =>
      createRow({
        id: `e-${index}`,
        helpers_needed: (index + 1) * 10,
      })
    );

    const result = buildAnalyticsChartAggregation(chart, rows);

    expect(result.rows.length).toBeLessThanOrEqual(10);
    expect(result.rows[0]?.label).toContain('1');
  });

  it('sortiert Kreisdiagramme nach Größe', () => {
    const chart = createChart({ chartType: 'pie' });
    const result = buildAnalyticsChartAggregation(chart, [
      createRow({ id: 'e1', status_verwalter_text: 'Offen' }),
      createRow({ id: 'e2', status_verwalter_text: 'Offen' }),
      createRow({ id: 'e3', status_verwalter_text: 'Bestätigt' }),
    ]);

    expect(result.rows[0]).toEqual(
      expect.objectContaining({ label: 'Offen', value: 2 })
    );
  });

  it('aggregiert Datumsfelder nach Wochentag', () => {
    const chart = createChart({
      dimensionKey: 'start_day',
      display: {
        dimensionLabel: 'Einsatzdatum (Wochentag)',
        dimensionDatatype: 'date',
      },
    });

    const result = buildAnalyticsChartAggregation(chart, [
      createRow({
        id: 'e1',
        start: new Date('2026-04-13T10:00:00.000Z'),
        end: new Date('2026-04-13T12:00:00.000Z'),
      }),
      createRow({
        id: 'e2',
        start: new Date('2026-04-20T10:00:00.000Z'),
        end: new Date('2026-04-20T12:00:00.000Z'),
      }),
      createRow({
        id: 'e3',
        start: new Date('2026-04-15T10:00:00.000Z'),
        end: new Date('2026-04-15T12:00:00.000Z'),
      }),
    ]);

    expect(result.rows).toEqual([
      expect.objectContaining({ label: 'Montag', value: 2 }),
      expect.objectContaining({ label: 'Mittwoch', value: 1 }),
    ]);
  });

  it('filtert nach benutzerdefiniertem Zeitraum über Start oder Ende', () => {
    const row = createRow({
      start: new Date('2026-03-01T08:00:00.000Z'),
      end: new Date('2026-03-05T10:00:00.000Z'),
    });

    expect(
      isEinsatzWithinAnalyticsFilter(
        row,
        {
          timeframe: {
            preset: 'custom',
            from: '2026-03-05',
            to: '2026-03-07',
          },
        },
        new Date('2026-03-06T10:00:00.000Z')
      )
    ).toBe(true);
  });

  it('formatiert benutzerdefinierte Zeiträume relativ zum heutigen Datum', () => {
    expect(
      getTimeframeLabel(
        {
          preset: 'custom',
          from: '2026-03-20',
          to: '2026-04-15',
        },
        new Date('2026-04-15T10:00:00.000Z')
      )
    ).toBe('letzte 26 Tage');
  });
});
