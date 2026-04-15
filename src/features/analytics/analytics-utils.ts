import {
  differenceInCalendarDays,
  endOfDay,
  endOfYear,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfDay,
  startOfYear,
  subDays,
} from 'date-fns';
import { de } from 'date-fns/locale';
import type {
  EinsatzListCustomFieldMeta,
  EinsatzListCustomFieldValue,
  EinsatzListItem,
} from '@/features/einsatz/types';
import type {
  AnalyticsChartAggregationResult,
  AnalyticsChartRecord,
  AnalyticsDimensionDatatype,
  AnalyticsDimensionDescriptor,
  AnalyticsFilterConfig,
} from './types';

type AnalyticsTerminology = {
  einsatzSingular?: string;
  einsatzPlural?: string;
  helperPlural?: string;
};

type AnalyticsChartTitleOptions = {
  dimensionLabel: string;
  metricAggregation: AnalyticsChartRecord['metricAggregation'];
  einsatzPlural?: string;
};

function getStaticDimensions({
  einsatzSingular = 'Einsatz',
  helperPlural = 'Helfer:innen',
}: AnalyticsTerminology): AnalyticsDimensionDescriptor[] {
  return [
    {
      kind: 'static',
      key: 'status',
      label: 'Status',
      datatype: 'select',
    },
    {
      kind: 'static',
      key: 'start_day',
      label: `${einsatzSingular}datum (Wochentag)`,
      datatype: 'date',
    },
    {
      kind: 'static',
      key: 'created_by_name',
      label: 'Erstellt von',
      datatype: 'select',
    },
    {
      kind: 'static',
      key: 'categories',
      label: 'Kategorien',
      datatype: 'multi-select',
    },
    {
      kind: 'static',
      key: 'template_name',
      label: 'Vorlage',
      datatype: 'select',
    },
    {
      kind: 'static',
      key: 'helper_count',
      label: `Anzahl eingetragene ${helperPlural}`,
      datatype: 'number',
    },
    {
      kind: 'static',
      key: 'helpers_needed',
      label: `Anzahl benötigte ${helperPlural}`,
      datatype: 'number',
    },
  ];
}

type AggregationBucket = {
  key: string;
  label: string;
  sortOrder: number | string;
  value: number;
};

type RawBucketValue = {
  key: string;
  label: string;
  sortOrder: number | string;
  numericValue?: number;
};

function normalizeCustomDatatype(
  datatype: EinsatzListCustomFieldMeta['datatype']
): AnalyticsDimensionDatatype | null {
  if (
    datatype === 'select' ||
    datatype === 'boolean' ||
    datatype === 'date' ||
    datatype === 'number'
  ) {
    return datatype;
  }

  return null;
}

function getCustomDimensionDescriptors(rows: EinsatzListItem[]) {
  const fields = new Map<string, AnalyticsDimensionDescriptor>();

  for (const row of rows) {
    for (const field of row.custom_field_meta) {
      const datatype = normalizeCustomDatatype(field.datatype);
      if (!datatype || fields.has(field.key)) {
        continue;
      }

      fields.set(field.key, {
        kind: 'custom',
        key: field.key,
        label: field.label,
        datatype,
      });
    }
  }

  return Array.from(fields.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'de')
  );
}

export function getAnalyticsDimensionDescriptors(
  rows: EinsatzListItem[],
  terminology: AnalyticsTerminology = {}
) {
  return [
    ...getStaticDimensions(terminology),
    ...getCustomDimensionDescriptors(rows),
  ];
}

export function getDefaultAnalyticsFilters(): AnalyticsFilterConfig {
  return {
    timeframe: {
      preset: 'all',
      from: null,
      to: null,
    },
  };
}

function getNormalizedChartDimensionLabel(label: string) {
  return label === 'Kategorien' ? 'Kategorie' : label;
}

function humanizeChartDimensionKey(key: string) {
  return key
    .replace(/^(cf|custom)[-_]/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function getAnalyticsChartTitle({
  dimensionLabel,
  metricAggregation,
  einsatzPlural = 'Einsätze',
}: AnalyticsChartTitleOptions) {
  const fieldTitle = getNormalizedChartDimensionLabel(dimensionLabel);

  return metricAggregation === 'participant_sum'
    ? `Teilnehmende Personen pro ${fieldTitle}`
    : `${einsatzPlural} pro ${fieldTitle}`;
}

export function getAnalyticsDimensionByKey(
  rows: EinsatzListItem[],
  chart: Pick<
    AnalyticsChartRecord,
    'dimensionKey' | 'dimensionKind' | 'display'
  >,
  terminology: AnalyticsTerminology = {}
) {
  const descriptor = getAnalyticsDimensionDescriptors(rows, terminology).find(
    (field) =>
      field.key === chart.dimensionKey && field.kind === chart.dimensionKind
  );

  if (descriptor) {
    return descriptor;
  }

  const fallbackLabel =
    chart.display.dimensionLabel ??
    (chart.dimensionKind === 'custom'
      ? humanizeChartDimensionKey(chart.dimensionKey) || chart.dimensionKey
      : chart.dimensionKey);

  return {
    kind: chart.dimensionKind,
    key: chart.dimensionKey,
    label: fallbackLabel,
    datatype: 'text',
  } satisfies AnalyticsDimensionDescriptor;
}

export function getTimeframeRange(
  filters: AnalyticsFilterConfig,
  now: Date = new Date()
) {
  switch (filters.timeframe.preset) {
    case 'last30Days':
      return {
        from: startOfDay(subDays(now, 29)),
        to: endOfDay(now),
      };
    case 'last90Days':
      return {
        from: startOfDay(subDays(now, 89)),
        to: endOfDay(now),
      };
    case 'thisYear':
      return {
        from: startOfYear(now),
        to: endOfYear(now),
      };
    case 'custom':
      if (!filters.timeframe.from || !filters.timeframe.to) {
        return null;
      }

      {
        const fromDate = parseISO(filters.timeframe.from);
        const toDate = parseISO(filters.timeframe.to);

        if (
          Number.isNaN(fromDate.getTime()) ||
          Number.isNaN(toDate.getTime())
        ) {
          return null;
        }

        return {
          from: startOfDay(fromDate),
          to: endOfDay(toDate),
        };
      }
    case 'all':
    default:
      return null;
  }
}

export function getTimeframeLabel(
  timeframe: AnalyticsFilterConfig['timeframe'],
  now: Date = new Date()
): string {
  switch (timeframe.preset) {
    case 'last30Days':
      return 'letzte 30 Tage';
    case 'last90Days':
      return 'letzte 90 Tage';
    case 'thisYear':
      return 'dieses Jahr';
    case 'custom':
    {
      if (!timeframe.from || !timeframe.to) {
        return 'benutzerdefiniert';
      }

      const fromDate = parseISO(timeframe.from);
      const toDate = parseISO(timeframe.to);

      if (
        Number.isNaN(fromDate.getTime()) ||
        Number.isNaN(toDate.getTime())
      ) {
        return 'benutzerdefiniert';
      }

      if (isSameDay(toDate, now)) {
        const days = differenceInCalendarDays(
          startOfDay(now),
          startOfDay(fromDate)
        );

        if (days <= 0) {
          return 'heute';
        }

        return days === 1 ? 'letzter Tag' : `letzte ${days} Tage`;
      }

      return `${format(fromDate, 'd. MMMM', { locale: de })} bis ${format(
        toDate,
        'd. MMMM yyyy',
        { locale: de }
      )}`;
    }
    case 'all':
    default:
      return '';
  }
}

export function isEinsatzWithinAnalyticsFilter(
  row: EinsatzListItem,
  filters: AnalyticsFilterConfig,
  now: Date = new Date()
) {
  const timeframe = getTimeframeRange(filters, now);
  if (!timeframe) {
    return true;
  }

  return row.start <= timeframe.to && row.end >= timeframe.from;
}

function getMetricValue(
  row: EinsatzListItem,
  metricAggregation: AnalyticsChartRecord['metricAggregation']
) {
  if (metricAggregation === 'participant_sum') {
    return row.participant_count ?? 0;
  }

  return 1;
}

function createTextBucket(label: string): RawBucketValue | null {
  const normalizedLabel = label.trim();
  if (normalizedLabel.length === 0) {
    return null;
  }

  return {
    key: normalizedLabel,
    label: normalizedLabel,
    sortOrder: normalizedLabel.toLocaleLowerCase('de'),
  };
}

function createDateBucket(value: Date): RawBucketValue {
  const dayIndex = getDay(value);
  const mondayFirstOrder = dayIndex === 0 ? 6 : dayIndex - 1;

  return {
    key: `weekday-${mondayFirstOrder}`,
    label: format(value, 'EEEE', { locale: de }),
    sortOrder: mondayFirstOrder,
  };
}

function createNumericBucket(value: number): RawBucketValue {
  return {
    key: String(value),
    label: value.toLocaleString('de-DE'),
    sortOrder: value,
    numericValue: value,
  };
}

function mapBooleanLabel(value: string) {
  if (value === 'true') return 'Ja';
  if (value === 'false') return 'Nein';
  return value;
}

function getCustomFieldValue(
  row: EinsatzListItem,
  key: string
): EinsatzListCustomFieldValue {
  return row.custom_fields[key] ?? null;
}

function getRawBucketsForDimension(
  row: EinsatzListItem,
  descriptor: AnalyticsDimensionDescriptor
): RawBucketValue[] {
  switch (descriptor.key) {
    case 'status': {
      const bucket = createTextBucket(row.status_verwalter_text);
      return bucket ? [bucket] : [];
    }
    case 'start_day':
      return [createDateBucket(row.start)];
    case 'created_by_name': {
      const bucket = row.created_by_name
        ? createTextBucket(row.created_by_name)
        : null;
      return bucket ? [bucket] : [];
    }
    case 'categories':
      return row.category_labels
        .map((label) => createTextBucket(label))
        .filter((value): value is RawBucketValue => value !== null);
    case 'template_name': {
      const bucket = row.template_name
        ? createTextBucket(row.template_name)
        : null;
      return bucket ? [bucket] : [];
    }
    case 'helper_count':
      return [createNumericBucket(row.helper_count)];
    case 'helpers_needed':
      return [createNumericBucket(row.helpers_needed)];
    default:
      break;
  }

  const customValue = getCustomFieldValue(row, descriptor.key);

  if (customValue == null || customValue === '') {
    return [];
  }

  if (descriptor.datatype === 'date' && customValue instanceof Date) {
    return [createDateBucket(customValue)];
  }

  if (descriptor.datatype === 'number' && typeof customValue === 'number') {
    return [createNumericBucket(customValue)];
  }

  if (descriptor.datatype === 'boolean' && typeof customValue === 'string') {
    const bucket = createTextBucket(mapBooleanLabel(customValue));
    return bucket ? [bucket] : [];
  }

  const bucket = createTextBucket(String(customValue));
  return bucket ? [bucket] : [];
}

function getNumericBucketStep(values: number[]) {
  const maxValue = Math.max(...values);
  return Math.max(1, Math.ceil(maxValue / 10));
}

function getNumericBucketForValue(
  value: number,
  step: number,
  hasZeroOrNegative: boolean
) {
  const bucketStart = hasZeroOrNegative
    ? Math.floor(value / step) * step
    : Math.floor((value - 1) / step) * step + 1;
  const bucketEnd = bucketStart + step - 1;
  const startLabel = bucketStart.toLocaleString('de-DE');
  const endLabel = bucketEnd.toLocaleString('de-DE');

  return {
    key: `${bucketStart}-${bucketEnd}`,
    label: bucketStart === bucketEnd ? startLabel : `${startLabel}–${endLabel}`,
    sortOrder: bucketStart,
  };
}

function applyNumericBucketing(
  buckets: Array<RawBucketValue & { metricValue: number }>
): AggregationBucket[] {
  const numericValues = buckets
    .map((bucket) => bucket.numericValue)
    .filter((value): value is number => typeof value === 'number');

  if (numericValues.length === 0) {
    return [];
  }

  const hasZeroOrNegative = numericValues.some((value) => value <= 0);
  const step = getNumericBucketStep(numericValues);
  const aggregated = new Map<string, AggregationBucket>();

  for (const bucket of buckets) {
    if (typeof bucket.numericValue !== 'number') {
      continue;
    }

    const numericBucket = getNumericBucketForValue(
      bucket.numericValue,
      step,
      hasZeroOrNegative
    );
    const existing = aggregated.get(numericBucket.key);

    if (existing) {
      existing.value += bucket.metricValue;
      continue;
    }

    aggregated.set(numericBucket.key, {
      ...numericBucket,
      value: bucket.metricValue,
    });
  }

  return Array.from(aggregated.values()).sort(
    (a, b) => Number(a.sortOrder) - Number(b.sortOrder)
  );
}

function sortAggregationRows(
  rows: AggregationBucket[],
  chartType: AnalyticsChartRecord['chartType']
) {
  if (chartType === 'pie') {
    return [...rows].sort((a, b) => b.value - a.value);
  }

  return [...rows].sort((a, b) => {
    if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
      return a.sortOrder - b.sortOrder;
    }

    return String(a.sortOrder).localeCompare(String(b.sortOrder), 'de');
  });
}

export function buildAnalyticsChartAggregation(
  chart: AnalyticsChartRecord,
  rows: EinsatzListItem[],
  terminology: AnalyticsTerminology = {},
  now: Date = new Date()
): AnalyticsChartAggregationResult {
  const descriptor = getAnalyticsDimensionByKey(rows, chart, terminology);
  const filteredRows = rows.filter((row) =>
    isEinsatzWithinAnalyticsFilter(row, chart.filters, now)
  );
  const metricLabel =
    chart.metricAggregation === 'participant_sum'
      ? 'Teilnehmende Personen'
      : 'Gruppen';
  const dimensionLabel = descriptor.label;
  const chartLabel = getAnalyticsChartTitle({
    dimensionLabel,
    metricAggregation: chart.metricAggregation,
    einsatzPlural: terminology.einsatzPlural,
  });

  if (descriptor.datatype === 'number') {
    const numericRows = filteredRows.flatMap((row) =>
      getRawBucketsForDimension(row, descriptor).map((bucket) => ({
        ...bucket,
        metricValue: getMetricValue(row, chart.metricAggregation),
      }))
    );

    return {
      rows: sortAggregationRows(
        applyNumericBucketing(numericRows),
        chart.chartType
      ),
      metricLabel,
      chartLabel,
      dimensionLabel,
    };
  }

  const aggregated = new Map<string, AggregationBucket>();

  for (const row of filteredRows) {
    const metricValue = getMetricValue(row, chart.metricAggregation);
    const buckets = getRawBucketsForDimension(row, descriptor);

    for (const bucket of buckets) {
      const existing = aggregated.get(bucket.key);

      if (existing) {
        existing.value += metricValue;
        continue;
      }

      aggregated.set(bucket.key, {
        ...bucket,
        value: metricValue,
      });
    }
  }

  return {
    rows: sortAggregationRows(Array.from(aggregated.values()), chart.chartType),
    metricLabel,
    chartLabel,
    dimensionLabel,
  };
}
