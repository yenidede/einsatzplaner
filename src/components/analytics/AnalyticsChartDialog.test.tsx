/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AnalyticsChartDialog } from './AnalyticsChartDialog';
import type { AnalyticsDimensionDescriptor } from '@/features/analytics/types';

const fields: AnalyticsDimensionDescriptor[] = [
  {
    kind: 'static',
    key: 'status',
    label: 'Status',
    datatype: 'select',
  },
  {
    kind: 'custom',
    key: 'category',
    label: 'Kategorie',
    datatype: 'select',
  },
];

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

describe('AnalyticsChartDialog', () => {
  it('zeigt Diagrammtyp-Auswahl als ersten Schritt und wechselt danach zur Konfiguration', () => {
    render(
      <AnalyticsChartDialog
        chart={null}
        fields={fields}
        einsatzSingular="Einsatz"
        einsatzPlural="Einsätze"
        isOpen
        isPending={false}
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Diagrammtyp wählen' })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy();

    fireEvent.click(screen.getByText('Linie'));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByText('Beschreibung')).toBeTruthy();
    expect(screen.getByText('Auswertungsmodus')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Zeitraum' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Diagramm erstellen' })).toBeTruthy();
  });

  it('übermittelt beim Bearbeiten nur die abgeleiteten Felder', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AnalyticsChartDialog
        chart={{
          id: 'chart-1',
          orgId: 'org-1',
          createdBy: 'user-1',
          createdByName: 'Max Mustermann',
          description: null,
          chartType: 'bar',
          dataset: 'einsatz',
          dimensionKind: 'static',
          dimensionKey: 'status',
          metricAggregation: 'group_count',
          filters: {
            timeframe: {
              preset: 'all',
              from: null,
              to: null,
            },
          },
          display: {
            visualChartType: 'bar',
            dimensionLabel: 'Status',
          },
          createdAt: new Date('2026-04-10T10:00:00.000Z'),
          updatedAt: new Date('2026-04-10T10:00:00.000Z'),
          canEdit: true,
          canDelete: true,
        }}
        fields={fields}
        einsatzSingular="Einsatz"
        einsatzPlural="Einsätze"
        isOpen
        isPending={false}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Diagramm speichern' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        'chart-1',
        expect.objectContaining({
          description: null,
          chartType: 'bar',
          dimensionKey: 'status',
        })
      );
    });
  });
});
