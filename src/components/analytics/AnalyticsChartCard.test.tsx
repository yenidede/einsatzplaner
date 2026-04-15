// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AnalyticsChartRecord } from '@/features/analytics/types';
import type { EinsatzListItem } from '@/features/einsatz/types';

const mockBuildAnalyticsChartAggregation = vi.hoisted(() => vi.fn());
const mockGetTimeframeLabel = vi.hoisted(() => vi.fn());

vi.mock('@/features/analytics/analytics-utils', () => ({
  buildAnalyticsChartAggregation: mockBuildAnalyticsChartAggregation,
  getTimeframeLabel: mockGetTimeframeLabel,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div data-slot="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div data-slot="dropdown-menu-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div data-slot="dropdown-menu-content">{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: ReactNode }) => (
    <div data-slot="dropdown-menu-group">{children}</div>
  ),
  DropdownMenuItem: ({
    className,
    variant = 'default',
    children,
  }: {
    className?: string;
    variant?: 'default' | 'destructive';
    children: ReactNode;
  }) => (
    <button
      className={className}
      data-variant={variant}
      type="button"
    >
      {children}
    </button>
  ),
}));

import { AnalyticsChartCard } from './AnalyticsChartCard';

function createChart(): AnalyticsChartRecord {
  return {
    id: 'chart-1',
    orgId: 'org-1',
    createdBy: null,
    createdByName: null,
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
    display: {},
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
    canEdit: true,
    canDelete: true,
  };
}

describe('AnalyticsChartCard', () => {
  it('markiert die Löschaktion als destructive', () => {
    mockBuildAnalyticsChartAggregation.mockReturnValue({
      rows: [],
      metricLabel: 'Einsätze',
      chartLabel: 'Status',
      dimensionLabel: 'Status',
    });
    mockGetTimeframeLabel.mockReturnValue(null);

    const chart = createChart();
    const rows = [] satisfies EinsatzListItem[];

    render(
      <AnalyticsChartCard
        chart={chart}
        rows={rows}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Löschen' }).dataset.variant
    ).toBe('destructive');
  });
});
