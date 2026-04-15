import type { analytics_chart } from '@/generated/prisma';

export type AnalyticsChartType = 'bar' | 'line' | 'area' | 'pie';
export type AnalyticsMetricAggregation = 'group_count' | 'participant_sum';
export type AnalyticsDimensionKind = 'static' | 'custom';
export type AnalyticsDimensionDatatype =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi-select';
export type AnalyticsTimeframePreset =
  | 'all'
  | 'last30Days'
  | 'last90Days'
  | 'thisYear'
  | 'custom';

export type AnalyticsTimeframeFilter = {
  preset: AnalyticsTimeframePreset;
  from: string | null;
  to: string | null;
};

export type AnalyticsFilterConfig = {
  timeframe: AnalyticsTimeframeFilter;
};

export type AnalyticsDisplayConfig = {
  visualChartType?: AnalyticsChartType;
  dimensionLabel?: string;
};

export type AnalyticsDimensionDescriptor = {
  kind: AnalyticsDimensionKind;
  key: string;
  label: string;
  datatype: AnalyticsDimensionDatatype;
};

export type AnalyticsChartFormValues = {
  description: string;
  chartType: AnalyticsChartType;
  dimensionKind: AnalyticsDimensionKind;
  dimensionKey: string;
  metricAggregation: AnalyticsMetricAggregation;
  timeframePreset: AnalyticsTimeframePreset;
  timeframeFrom: string;
  timeframeTo: string;
};

export type AnalyticsChartInput = {
  description: string | null;
  chartType: AnalyticsChartType;
  dimensionKind: AnalyticsDimensionKind;
  dimensionKey: string;
  metricAggregation: AnalyticsMetricAggregation;
  filters: AnalyticsFilterConfig;
  display: AnalyticsDisplayConfig;
};

export type AnalyticsChartRecord = {
  id: string;
  orgId: string;
  createdBy: string | null;
  createdByName: string | null;
  description: string | null;
  chartType: AnalyticsChartType;
  dataset: string;
  dimensionKind: AnalyticsDimensionKind;
  dimensionKey: string;
  metricAggregation: AnalyticsMetricAggregation;
  filters: AnalyticsFilterConfig;
  display: AnalyticsDisplayConfig;
  createdAt: Date;
  updatedAt: Date;
  canEdit: boolean;
  canDelete: boolean;
};

export type AnalyticsChartAggregateRow = {
  key: string;
  label: string;
  value: number;
  sortOrder: number | string;
};

export type AnalyticsChartAggregationResult = {
  rows: AnalyticsChartAggregateRow[];
  metricLabel: string;
  chartLabel: string;
  dimensionLabel: string;
};

export type AnalyticsChartDbRecord = analytics_chart;
