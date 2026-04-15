'use server';

import prisma from '@/lib/prisma';
import { getUserRolesInOrganization } from '@/DataAccessLayer/user';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import { parseISO } from 'date-fns';
import type {
  AnalyticsChartInput,
  AnalyticsChartRecord,
  AnalyticsDisplayConfig,
  AnalyticsFilterConfig,
} from './types';
import {
  hasAnalyticsAccessInOrgRoles,
  isAnalyticsSuperadminInOrgRoles,
} from './permissions';

const ANALYTICS_DATASET = 'einsatz';
const ANALYTICS_METRIC_KEY = 'value';

const DEFAULT_FILTERS: AnalyticsFilterConfig = {
  timeframe: {
    preset: 'all',
    from: null,
    to: null,
  },
};

const DEFAULT_DISPLAY: AnalyticsDisplayConfig = {
  dimensionLabel: 'Auswertung',
  dimensionDatatype: 'text',
};

function toStoredChartType(chartType: AnalyticsChartInput['chartType']) {
  return chartType === 'area' ? 'line' : chartType;
}

function toStoredDimensionKind(
  input: Pick<AnalyticsChartInput, 'dimensionKind' | 'dimensionKey'>
) {
  const normalizedDimensionKey = input.dimensionKey.trim();

  if (normalizedDimensionKey === 'start_day') {
    return 'time' as const;
  }

  return input.dimensionKind === 'custom'
    ? ('user_property' as const)
    : ('standard' as const);
}

function toChartDimensionKind(
  storedDimensionKind: AnalyticsDisplayConfig['storedDimensionKind'] | string
) {
  return storedDimensionKind === 'user_property' ? 'custom' : 'static';
}

function toStoredMetricAggregation(
  metricAggregation: AnalyticsChartInput['metricAggregation']
) {
  return metricAggregation === 'participant_sum' ? 'sum' : 'count';
}

function parseFilters(filtersJson: unknown): AnalyticsFilterConfig {
  if (
    typeof filtersJson === 'object' &&
    filtersJson !== null &&
    'timeframe' in filtersJson &&
    typeof filtersJson.timeframe === 'object' &&
    filtersJson.timeframe !== null
  ) {
    const timeframe = filtersJson.timeframe as Record<string, unknown>;
    const preset =
      typeof timeframe.preset === 'string' ? timeframe.preset : 'all';

    return {
      timeframe: {
        preset:
          preset === 'last30Days' ||
          preset === 'last90Days' ||
          preset === 'thisYear' ||
          preset === 'custom'
            ? preset
            : 'all',
        from: typeof timeframe.from === 'string' ? timeframe.from : null,
        to: typeof timeframe.to === 'string' ? timeframe.to : null,
      },
    };
  }

  return DEFAULT_FILTERS;
}

function parseDisplay(displayJson: unknown): AnalyticsDisplayConfig {
  if (typeof displayJson === 'object' && displayJson !== null) {
    const rawDisplay = displayJson as Record<string, unknown>;
    const dimensionLabel =
      typeof rawDisplay.dimensionLabel === 'string'
        ? rawDisplay.dimensionLabel
        : DEFAULT_DISPLAY.dimensionLabel;
    const dimensionDatatype =
      rawDisplay.dimensionDatatype === 'text' ||
      rawDisplay.dimensionDatatype === 'number' ||
      rawDisplay.dimensionDatatype === 'date' ||
      rawDisplay.dimensionDatatype === 'boolean' ||
      rawDisplay.dimensionDatatype === 'select' ||
      rawDisplay.dimensionDatatype === 'multi-select'
        ? rawDisplay.dimensionDatatype
        : DEFAULT_DISPLAY.dimensionDatatype;

    return {
      dimensionLabel,
      dimensionDatatype,
      visualChartType:
        rawDisplay.visualChartType === 'bar' ||
        rawDisplay.visualChartType === 'line' ||
        rawDisplay.visualChartType === 'area' ||
        rawDisplay.visualChartType === 'pie'
          ? rawDisplay.visualChartType
          : undefined,
      storedDimensionKind:
        rawDisplay.storedDimensionKind === 'standard' ||
        rawDisplay.storedDimensionKind === 'time' ||
        rawDisplay.storedDimensionKind === 'user_property'
          ? rawDisplay.storedDimensionKind
          : undefined,
    };
  }

  return DEFAULT_DISPLAY;
}

function getUserDisplayName(user: {
  firstname: string | null;
  lastname: string | null;
}) {
  const fullName = [user.firstname, user.lastname]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();

  return fullName.length > 0 ? fullName : null;
}

async function assertAnalyticsAccess(orgId: string, userId: string) {
  const roles = await getUserRolesInOrganization(userId, orgId);

  if (!hasAnalyticsAccessInOrgRoles(roles)) {
    throw new Error(
      'Keine Berechtigung für Auswertungen in dieser Organisation.'
    );
  }

  return roles;
}

function mapChartRecord(
  chart: {
    id: string;
    org_id: string;
    created_by: string | null;
    title: string;
    description: string | null;
    chart_type: string;
    dataset: string;
    dimension_kind: string;
    dimension_key: string;
    metric_aggregation: string;
    metric_key: string;
    filters_json: unknown;
    display_json: unknown;
    created_at: Date;
    updated_at: Date;
    user: {
      firstname: string | null;
      lastname: string | null;
    } | null;
  },
  currentUserId: string,
  canDeleteAll: boolean
): AnalyticsChartRecord {
  const display = parseDisplay(chart.display_json);

  return {
    id: chart.id,
    orgId: chart.org_id,
    createdBy: chart.created_by,
    createdByName: chart.user ? getUserDisplayName(chart.user) : null,
    title: chart.title,
    description: chart.description,
    chartType:
      chart.chart_type === 'bar' ||
      chart.chart_type === 'line' ||
      chart.chart_type === 'pie'
        ? (display.visualChartType ?? chart.chart_type)
        : 'bar',
    dataset: chart.dataset,
    dimensionKind: toChartDimensionKind(
      display.storedDimensionKind ?? chart.dimension_kind
    ),
    dimensionKey: chart.dimension_key,
    metricAggregation:
      chart.metric_aggregation === 'sum'
        ? 'participant_sum'
        : 'group_count',
    metricKey: chart.metric_key,
    filters: parseFilters(chart.filters_json),
    display,
    createdAt: chart.created_at,
    updatedAt: chart.updated_at,
    canEdit: true,
    canDelete: canDeleteAll || chart.created_by === currentUserId,
  };
}

function validateChartInput(input: AnalyticsChartInput) {
  const normalizedTitle = input.title.trim();
  const normalizedDimensionKey = input.dimensionKey.trim();

  if (normalizedTitle.length === 0) {
    throw new Error('Bitte geben Sie einen Titel ein.');
  }

  if (normalizedDimensionKey.length === 0) {
    throw new Error('Bitte wählen Sie ein Feld für die Auswertung aus.');
  }

  if (
    input.filters.timeframe.preset === 'custom' &&
    (!input.filters.timeframe.from || !input.filters.timeframe.to)
  ) {
    throw new Error(
      'Bitte wählen Sie einen gültigen benutzerdefinierten Zeitraum.'
    );
  }

  if (input.filters.timeframe.preset === 'custom') {
    const fromDate = parseISO(input.filters.timeframe.from ?? '');
    const toDate = parseISO(input.filters.timeframe.to ?? '');

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      throw new Error(
        'Bitte wählen Sie einen gültigen benutzerdefinierten Zeitraum.'
      );
    }
  }
}

export async function getAnalyticsChartsByOrgId(orgId: string) {
  const { session } = await requireAuth();
  const activeOrgId = session.user.activeOrganization?.id;

  if (!activeOrgId || activeOrgId !== orgId) {
    throw new Error('Keine aktive Organisation ausgewählt.');
  }

  if (!(await hasPermission(session, 'analytics:read', orgId))) {
    throw new Error('Keine Berechtigung für Auswertungen.');
  }

  const roles = await assertAnalyticsAccess(orgId, session.user.id);
  const canDeleteAll = isAnalyticsSuperadminInOrgRoles(roles);

  const charts = await prisma.analytics_chart.findMany({
    where: {
      org_id: orgId,
      dataset: ANALYTICS_DATASET,
    },
    orderBy: {
      created_at: 'desc',
    },
    include: {
      user: {
        select: {
          firstname: true,
          lastname: true,
        },
      },
    },
  });

  return charts.map((chart) =>
    mapChartRecord(chart, session.user.id, canDeleteAll)
  );
}

export async function createAnalyticsChart(
  orgId: string,
  input: AnalyticsChartInput
) {
  const { session } = await requireAuth();
  const activeOrgId = session.user.activeOrganization?.id;

  if (!activeOrgId || activeOrgId !== orgId) {
    throw new Error('Keine aktive Organisation ausgewählt.');
  }

  if (!(await hasPermission(session, 'analytics:read', orgId))) {
    throw new Error('Keine Berechtigung zum Erstellen von Auswertungen.');
  }

  await assertAnalyticsAccess(orgId, session.user.id);
  validateChartInput(input);

  const chart = await prisma.analytics_chart.create({
    data: {
      org_id: orgId,
      created_by: session.user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      chart_type: toStoredChartType(input.chartType),
      dataset: ANALYTICS_DATASET,
      dimension_kind: toStoredDimensionKind(input),
      dimension_key: input.dimensionKey.trim(),
      metric_aggregation: toStoredMetricAggregation(input.metricAggregation),
      metric_key: ANALYTICS_METRIC_KEY,
      filters_json: input.filters,
      display_json: {
        ...input.display,
        visualChartType: input.chartType,
        storedDimensionKind: toStoredDimensionKind(input),
      },
    },
    include: {
      user: {
        select: {
          firstname: true,
          lastname: true,
        },
      },
    },
  });

  return mapChartRecord(chart, session.user.id, false);
}

export async function updateAnalyticsChart(
  chartId: string,
  input: AnalyticsChartInput
) {
  const { session } = await requireAuth();
  validateChartInput(input);

  const existingChart = await prisma.analytics_chart.findUnique({
    where: { id: chartId },
    select: {
      id: true,
      org_id: true,
      dataset: true,
    },
  });

  if (!existingChart || existingChart.dataset !== ANALYTICS_DATASET) {
    throw new Error('Diagramm nicht gefunden.');
  }

  const activeOrgId = session.user.activeOrganization?.id;
  if (!activeOrgId || activeOrgId !== existingChart.org_id) {
    throw new Error('Keine aktive Organisation ausgewählt.');
  }

  if (!(await hasPermission(session, 'analytics:read', existingChart.org_id))) {
    throw new Error('Keine Berechtigung zum Bearbeiten dieses Diagramms.');
  }

  const roles = await assertAnalyticsAccess(
    existingChart.org_id,
    session.user.id
  );
  const canDeleteAll = isAnalyticsSuperadminInOrgRoles(roles);

  const chart = await prisma.analytics_chart.update({
    where: { id: chartId },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      chart_type: toStoredChartType(input.chartType),
      dimension_kind: toStoredDimensionKind(input),
      dimension_key: input.dimensionKey.trim(),
      metric_aggregation: toStoredMetricAggregation(input.metricAggregation),
      filters_json: input.filters,
      display_json: {
        ...input.display,
        visualChartType: input.chartType,
        storedDimensionKind: toStoredDimensionKind(input),
      },
    },
    include: {
      user: {
        select: {
          firstname: true,
          lastname: true,
        },
      },
    },
  });

  return mapChartRecord(chart, session.user.id, canDeleteAll);
}

export async function deleteAnalyticsChart(chartId: string) {
  const { session } = await requireAuth();

  const existingChart = await prisma.analytics_chart.findUnique({
    where: { id: chartId },
    select: {
      id: true,
      org_id: true,
      created_by: true,
      dataset: true,
    },
  });

  if (!existingChart || existingChart.dataset !== ANALYTICS_DATASET) {
    throw new Error('Diagramm nicht gefunden.');
  }

  const activeOrgId = session.user.activeOrganization?.id;
  if (!activeOrgId || activeOrgId !== existingChart.org_id) {
    throw new Error('Keine aktive Organisation ausgewählt.');
  }

  if (!(await hasPermission(session, 'analytics:read', existingChart.org_id))) {
    throw new Error('Keine Berechtigung zum Löschen dieses Diagramms.');
  }

  const roles = await assertAnalyticsAccess(
    existingChart.org_id,
    session.user.id
  );
  const canDeleteAll = isAnalyticsSuperadminInOrgRoles(roles);

  if (!canDeleteAll && existingChart.created_by !== session.user.id) {
    throw new Error('Sie können nur Ihre eigenen Diagramme löschen.');
  }

  await prisma.analytics_chart.delete({
    where: {
      id: chartId,
    },
  });
}
