'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
} from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import type { AnalyticsChartRecord } from '@/features/analytics/types';
import {
  buildAnalyticsChartAggregation,
  getTimeframeLabel,
} from '@/features/analytics/analytics-utils';
import type { EinsatzListItem } from '@/features/einsatz/types';
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

type AnalyticsChartCardProps = {
  chart: AnalyticsChartRecord;
  rows: EinsatzListItem[];
  terminology?: {
    einsatzSingular?: string;
    einsatzPlural?: string;
    helperPlural?: string;
  };
  onEdit: (chart: AnalyticsChartRecord) => void;
  onDelete: (chart: AnalyticsChartRecord) => void;
};

function getChartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function getSeriesKey(index: number) {
  return `segment_${index}`;
}

function truncateAxisLabel(label: string, maxLength: number = 16) {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function getCategoryAxisLabel(label: string) {
  const match = /\(([^)]+)\)\s*$/.exec(label);
  return match?.[1]?.trim() || label;
}

export function AnalyticsChartCard({
  chart,
  rows,
  terminology,
  onEdit,
  onDelete,
}: AnalyticsChartCardProps) {
  const aggregation = useMemo(
    () => buildAnalyticsChartAggregation(chart, rows, terminology),
    [chart, rows, terminology]
  );

  const chartConfig = useMemo<ChartConfig>(() => {
    if (chart.chartType === 'pie') {
      return aggregation.rows.reduce<ChartConfig>((config, row, index) => {
        config[getSeriesKey(index)] = {
          label: row.label,
          color: getChartColor(index),
        };
        return config;
      }, {});
    }

    return {
      value: {
        label: aggregation.metricLabel,
        color: getChartColor(0),
      },
    };
  }, [aggregation.metricLabel, aggregation.rows, chart.chartType]);

  const pieData = useMemo(() => {
    return aggregation.rows.map((row, index) => ({
      ...row,
      fill: getChartColor(index),
      segment: getSeriesKey(index),
    }));
  }, [aggregation.rows]);

  const cartesianData = useMemo(() => {
    return aggregation.rows.map((row, index) => ({
      label: row.label,
      axisLabel:
        chart.dimensionKey === 'categories'
          ? getCategoryAxisLabel(row.label)
          : row.label,
      value: row.value,
      fill: getChartColor(index),
    }));
  }, [aggregation.rows, chart.dimensionKey]);

  const cartesianChartMinWidth = useMemo(() => {
    return Math.max(320, cartesianData.length * 96);
  }, [cartesianData.length]);

  const titleWithTimeframe = useMemo(() => {
    const timeframeLabel = getTimeframeLabel(chart.filters.timeframe);
    if (!timeframeLabel) {
      return aggregation.chartLabel;
    }
    return `${aggregation.chartLabel} (${timeframeLabel})`;
  }, [aggregation.chartLabel, chart.filters.timeframe]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{titleWithTimeframe}</CardTitle>
        {chart.description ? (
          <CardDescription>{chart.description}</CardDescription>
        ) : null}
        {(chart.canEdit || chart.canDelete) && (
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Diagrammaktionen öffnen"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  {chart.canEdit ? (
                    <DropdownMenuItem onClick={() => onEdit(chart)}>
                      Bearbeiten
                    </DropdownMenuItem>
                  ) : null}
                  {chart.canDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(chart)}
                    >
                      Löschen
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {aggregation.rows.length === 0 ? (
          <Empty className="min-h-72">
            <EmptyHeader>
              <EmptyTitle>Keine Daten verfügbar</EmptyTitle>
              <EmptyDescription>
                Für den gewählten Zeitraum und das ausgewählte Feld sind aktuell
                keine Werte vorhanden.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent />
          </Empty>
        ) : chart.chartType === 'pie' ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-72 min-h-72 w-full"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip
                content={
                  <ChartTooltipContent nameKey="segment" labelKey="label" />
                }
              />
              <Legend content={<ChartLegendContent nameKey="segment" />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="segment"
                cx="50%"
                cy="50%"
                outerRadius={90}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.segment} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="-mx-2 overflow-x-auto px-2">
            <div
              className="min-w-0"
              style={{ minWidth: `${cartesianChartMinWidth}px` }}
            >
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-72 min-h-72 w-full"
              >
                {chart.chartType === 'line' ? (
                  <LineChart accessibilityLayer data={cartesianData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="axisLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      tickFormatter={(value) =>
                        truncateAxisLabel(String(value))
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={(_, payload) =>
                            String(payload?.[0]?.payload?.label ?? '')
                          }
                        />
                      }
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Line
                      dataKey="value"
                      type="monotone"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                ) : chart.chartType === 'area' ? (
                  <AreaChart accessibilityLayer data={cartesianData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="axisLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      tickFormatter={(value) =>
                        truncateAxisLabel(String(value))
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={(_, payload) =>
                            String(payload?.[0]?.payload?.label ?? '')
                          }
                        />
                      }
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Area
                      dataKey="value"
                      type="monotone"
                      fill="var(--color-value)"
                      fillOpacity={0.25}
                      stroke="var(--color-value)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart accessibilityLayer data={cartesianData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="axisLabel"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      tickFormatter={(value) =>
                        truncateAxisLabel(String(value))
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) =>
                            String(payload?.[0]?.payload?.label ?? '')
                          }
                        />
                      }
                    />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="value" radius={4}>
                      {cartesianData.map((entry, index) => (
                        <Cell
                          key={`${entry.label}-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
