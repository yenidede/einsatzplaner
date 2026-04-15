'use client';

import { useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AnalyticsChartFormValues,
  AnalyticsChartInput,
  AnalyticsChartRecord,
  AnalyticsDimensionDescriptor,
  AnalyticsTimeframePreset,
} from '@/features/analytics/types';
import { getDefaultAnalyticsFilters } from '@/features/analytics/analytics-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateInput } from '@/components/ui/date-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormHeader,
  MultiStepFormContent,
  MultiStepFormProvider,
  NextButton,
  PreviousButton,
  SubmitButton,
} from '@/components/form/MultiStepForm';
import { Textarea } from '@/components/ui/textarea';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useMultiStepForm } from '@/components/form/useMultiStepForm';
import { getTimeframeLabel } from '@/features/analytics/analytics-utils';

const CHART_TYPE_OPTIONS = ['bar', 'line', 'area', 'pie'] as const;
const CUSTOM_TIMEFRAME_PRESET: AnalyticsTimeframePreset = 'custom';

type AnalyticsChartDialogProps = {
  chart: AnalyticsChartRecord | null;
  fields: AnalyticsDimensionDescriptor[];
  einsatzSingular: string;
  einsatzPlural: string;
  isOpen: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (chartId: string | null, input: AnalyticsChartInput) => Promise<void>;
};

const DEFAULT_FORM_VALUES: AnalyticsChartFormValues = {
  title: '',
  description: '',
  chartType: 'bar',
  dimensionKind: 'static',
  dimensionKey: 'status',
  metricAggregation: 'group_count',
  timeframePreset: 'all',
  timeframeFrom: '',
  timeframeTo: '',
};

const analyticsChartSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    chartType: z.enum(['bar', 'line', 'area', 'pie']),
    dimensionKind: z.enum(['static', 'custom']),
    dimensionKey: z.string().min(1, 'Bitte wählen Sie ein gültiges Feld aus.'),
    metricAggregation: z.enum(['group_count', 'participant_sum']),
    timeframePreset: z.enum([
      'all',
      'last30Days',
      'last90Days',
      'thisYear',
      'custom',
    ]),
    timeframeFrom: z.string(),
    timeframeTo: z.string(),
  })
  .refine(
    (data) => {
      if (data.timeframePreset !== 'custom') return true;
      return !!data.timeframeFrom && !!data.timeframeTo;
    },
    {
      message: 'Bitte wählen Sie einen benutzerdefinierten Zeitraum.',
      path: ['timeframeFrom'],
    }
  )
  .refine(
    (data) => {
      if (data.timeframePreset !== 'custom') return true;
      return data.timeframeFrom <= data.timeframeTo;
    },
    {
      message: 'Das Enddatum muss nach dem Startdatum liegen.',
      path: ['timeframeTo'],
    }
  );

type AnalyticsChartFormData = z.infer<typeof analyticsChartSchema>;

const PREVIEW_BAR_DATA = [
  { label: 'A', value: 10 },
  { label: 'B', value: 16 },
  { label: 'C', value: 8 },
  { label: 'D', value: 14 },
] as const;

const PREVIEW_PIE_DATA = [
  { name: 'A', value: 32 },
  { name: 'B', value: 24 },
  { name: 'C', value: 16 },
] as const;

const PREVIEW_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
] as const;

const PREVIEW_VALUE_CHART_CONFIG = {
  value: { label: 'Gruppen', color: PREVIEW_COLORS[0] },
} satisfies ChartConfig;

const PREVIEW_PIE_CHART_CONFIG = {
  a: { label: 'A', color: PREVIEW_COLORS[0] },
  b: { label: 'B', color: PREVIEW_COLORS[1] },
  c: { label: 'C', color: PREVIEW_COLORS[2] },
} satisfies ChartConfig;

function getFormValuesFromChart(
  chart: AnalyticsChartRecord | null
): AnalyticsChartFormValues {
  if (!chart) {
    return DEFAULT_FORM_VALUES;
  }

  return {
    title: chart.title,
    description: chart.description ?? '',
    chartType: chart.chartType,
    dimensionKind: chart.dimensionKind,
    dimensionKey: chart.dimensionKey,
    metricAggregation: chart.metricAggregation,
    timeframePreset: chart.filters.timeframe.preset,
    timeframeFrom: chart.filters.timeframe.from ?? '',
    timeframeTo: chart.filters.timeframe.to ?? '',
  };
}

function getFieldLabel(
  fields: AnalyticsDimensionDescriptor[],
  kind: AnalyticsChartFormValues['dimensionKind'],
  key: string
) {
  return (
    fields.find((field) => field.kind === kind && field.key === key) ?? null
  );
}

function getFieldOptionLabel(field: AnalyticsDimensionDescriptor) {
  return field.kind === 'custom' ? `Eigenes Feld: ${field.label}` : field.label;
}

function getGeneratedFieldTitle(label: string) {
  if (label === 'Kategorien') {
    return 'Kategorie';
  }

  return label;
}

function getStepDescription(step: 1 | 2) {
  return step === 1
    ? 'Wählen Sie zuerst einen Diagrammtyp mit Vorschau aus.'
    : 'Konfigurieren Sie Feld, Auswertungsmodus und Zeitraum.';
}

function getChartTypeLabel(chartType: AnalyticsChartFormValues['chartType']) {
  switch (chartType) {
    case 'line':
      return 'Linie';
    case 'area':
      return 'Fläche';
    case 'pie':
      return 'Kreis';
    case 'bar':
    default:
      return 'Balken';
  }
}

function ChartTypePreview({
  chartType,
}: {
  chartType: AnalyticsChartFormValues['chartType'];
}) {
  const chartConfig = useMemo<ChartConfig>(
    () =>
      chartType === 'pie'
        ? PREVIEW_PIE_CHART_CONFIG
        : PREVIEW_VALUE_CHART_CONFIG,
    [chartType]
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-28 w-full overflow-hidden"
    >
      {chartType === 'line' ? (
        <LineChart accessibilityLayer data={PREVIEW_BAR_DATA}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <Line
            dataKey="value"
            type="monotone"
            stroke={PREVIEW_COLORS[0]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      ) : chartType === 'area' ? (
        <AreaChart accessibilityLayer data={PREVIEW_BAR_DATA}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <Area
            dataKey="value"
            type="monotone"
            fill={PREVIEW_COLORS[0]}
            fillOpacity={0.24}
            stroke={PREVIEW_COLORS[0]}
          />
        </AreaChart>
      ) : chartType === 'pie' ? (
        <PieChart accessibilityLayer>
          <Pie
            data={PREVIEW_PIE_DATA}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={22}
            outerRadius={42}
          >
            {PREVIEW_PIE_DATA.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={PREVIEW_COLORS[index % PREVIEW_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      ) : (
        <BarChart accessibilityLayer data={PREVIEW_BAR_DATA}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis hide />
          <Bar dataKey="value" radius={4}>
            {PREVIEW_BAR_DATA.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={PREVIEW_COLORS[index % PREVIEW_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  );
}

function ChartTypeOptionCard({
  chartType,
  selected,
  onSelect,
}: {
  chartType: AnalyticsChartFormValues['chartType'];
  selected: boolean;
  onSelect: (chartType: AnalyticsChartFormValues['chartType']) => void;
}) {
  const id = `analytics-chart-type-${chartType}`;

  return (
    <div className="min-w-0">
      <RadioGroupItem id={id} value={chartType} className="sr-only" />
      <Label
        htmlFor={id}
        className={cn(
          'group block cursor-pointer rounded-xl border p-4 transition-colors',
          selected
            ? 'border-primary bg-primary/5'
            : 'hover:bg-muted/40 hover:border-border/80'
        )}
        onClick={() => onSelect(chartType)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">
                {getChartTypeLabel(chartType)}
              </p>
              {selected ? <Badge variant="secondary">Ausgewählt</Badge> : null}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {chartType === 'bar'
                ? 'Vergleiche zwischen Kategorien.'
                : chartType === 'line'
                  ? 'Entwicklung über eine Reihenfolge.'
                  : chartType === 'area'
                    ? 'Wie eine Linie, nur stärker betont.'
                    : 'Anteile im Verhältnis zueinander.'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ChartTypePreview chartType={chartType} />
        </div>
      </Label>
    </div>
  );
}

export function AnalyticsChartDialog({
  chart,
  fields,
  einsatzPlural,
  isOpen,
  isPending,
  onOpenChange,
  onSave,
}: AnalyticsChartDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AnalyticsChartFormData>({
    resolver: zodResolver(analyticsChartSchema),
    defaultValues: getFormValuesFromChart(chart),
    mode: 'onBlur',
  });

  const formValues = watch();

  useEffect(() => {
    reset(getFormValuesFromChart(chart));
  }, [chart, isOpen, reset]);

  const selectedField = useMemo(() => {
    return getFieldLabel(
      fields,
      formValues.dimensionKind,
      formValues.dimensionKey
    );
  }, [fields, formValues.dimensionKey, formValues.dimensionKind]);

  const generatedTitle = useMemo(() => {
    if (!selectedField) {
      return '';
    }

    const fieldTitle = getGeneratedFieldTitle(selectedField.label);

    return formValues.metricAggregation === 'participant_sum'
      ? `Teilnehmende Personen pro ${fieldTitle}`
      : `${einsatzPlural} pro ${fieldTitle}`;
  }, [einsatzPlural, formValues.metricAggregation, selectedField]);

  const handleSave: SubmitHandler<AnalyticsChartFormData> = async (data) => {
    if (!selectedField) {
      setError('dimensionKey', {
        type: 'manual',
        message: 'Bitte wählen Sie ein gültiges Feld aus.',
      });
      return;
    }

    const defaultFilters = getDefaultAnalyticsFilters();
    const filters =
      data.timeframePreset === 'custom'
        ? {
            timeframe: {
              preset: CUSTOM_TIMEFRAME_PRESET,
              from: data.timeframeFrom,
              to: data.timeframeTo,
            },
          }
        : {
            timeframe: {
              ...defaultFilters.timeframe,
              preset: data.timeframePreset,
            },
          };

    await onSave(chart?.id ?? null, {
      title: generatedTitle.trim(),
      description: data.description.trim() || null,
      chartType: data.chartType,
      dimensionKind: data.dimensionKind,
      dimensionKey: data.dimensionKey,
      metricAggregation: data.metricAggregation,
      filters,
      display: {
        dimensionLabel: selectedField.label,
        dimensionDatatype: selectedField.datatype,
      },
    });
  };

  const timeframeLabel = (preset: AnalyticsTimeframePreset): string => {
    if (preset === 'custom') {
      const label = getTimeframeLabel(
        {
          preset,
          from: formValues.timeframeFrom || null,
          to: formValues.timeframeTo || null,
        },
        new Date()
      );

      return label === 'benutzerdefiniert' ? 'Benutzerdefiniert' : label;
    }

    switch (preset) {
      case 'last30Days':
        return 'Letzte 30 Tage';
      case 'last90Days':
        return 'Letzte 90 Tage';
      case 'thisYear':
        return 'Dieses Jahr';
      case 'all':
      default:
        return 'Alle';
    }
  };

  const metricOptions = [
    { value: 'group_count', label: 'Pro Gruppe' },
    { value: 'participant_sum', label: 'Pro teilnehmende Person' },
  ] as const;

  const timeframeOptions: readonly AnalyticsTimeframePreset[] = [
    'all',
    'last30Days',
    'last90Days',
    'thisYear',
    'custom',
  ];
  const dimensionOptions = fields.map((field) => ({
    value: `${field.kind}:${field.key}`,
    label: getFieldOptionLabel(field),
  }));
  const selectedDimensionOption =
    dimensionOptions.find(
      (option) =>
        option.value ===
        `${formValues.dimensionKind}:${formValues.dimensionKey}`
    ) ?? null;

  const stepOne = (
    <FieldSet className="gap-4">
      <FieldLegend className="sr-only">Diagrammtyp-Auswahl</FieldLegend>
      <RadioGroup
        value={formValues.chartType}
        onValueChange={(value) => {
          const chartType = CHART_TYPE_OPTIONS.find(
            (option) => option === value
          );

          if (chartType) {
            setValue('chartType', chartType);
          }
        }}
        aria-label="Diagrammtyp wählen"
        className="grid gap-4 md:grid-cols-2"
      >
        {CHART_TYPE_OPTIONS.map((chartType) => (
          <ChartTypeOptionCard
            key={chartType}
            chartType={chartType}
            selected={formValues.chartType === chartType}
            onSelect={(nextType) => setValue('chartType', nextType)}
          />
        ))}
      </RadioGroup>
    </FieldSet>
  );

  const stepTwo = (
    <FieldGroup>
      <Field data-invalid={!!errors.dimensionKey}>
        <FieldLabel>Feld</FieldLabel>
        <FieldContent>
          <Combobox
            items={dimensionOptions}
            value={selectedDimensionOption}
            onValueChange={(selectedOption) => {
              if (!selectedOption) {
                setValue('dimensionKind', 'static');
                setValue('dimensionKey', '');
                return;
              }

              const colonIndex = selectedOption.value.indexOf(':');
              const kind =
                colonIndex >= 0
                  ? selectedOption.value.slice(0, colonIndex)
                  : 'static';
              const key =
                colonIndex >= 0
                  ? selectedOption.value.slice(colonIndex + 1)
                  : selectedOption.value;
              setValue(
                'dimensionKind',
                kind === 'custom' ? 'custom' : 'static'
              );
              setValue('dimensionKey', key);
              clearErrors('dimensionKey');
            }}
            itemToStringValue={(item) => item.label}
          >
            <ComboboxInput
              placeholder="Feld wählen"
              aria-invalid={errors.dimensionKey ? 'true' : 'false'}
              showClear
            />
            <ComboboxContent>
              <ComboboxEmpty>Kein Feld gefunden.</ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </FieldContent>
        {errors.dimensionKey && <FieldError errors={[errors.dimensionKey]} />}
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="analytics-description">Beschreibung</FieldLabel>
        <FieldContent>
          <Textarea
            id="analytics-description"
            {...register('description')}
            rows={3}
            aria-invalid={!!errors.description}
          />
          <FieldDescription>
            Optionaler Beschreibungstext unter dem Titel.
          </FieldDescription>
        </FieldContent>
        {errors.description && <FieldError errors={[errors.description]} />}
      </Field>

      <Field data-invalid={!!errors.metricAggregation}>
        <FieldLabel>Auswertungsmodus</FieldLabel>
        <FieldContent>
          <RadioGroup
            value={formValues.metricAggregation}
            onValueChange={(value) => {
              const selectedOption = metricOptions.find(
                (option) => option.value === value
              );

              if (selectedOption) {
                setValue('metricAggregation', selectedOption.value);
              }
            }}
            aria-label="Auswertungsmodus wählen"
            className="grid gap-2"
          >
            {metricOptions.map((option) => {
              const id = `analytics-metric-${option.value}`;

              return (
                <Field
                  key={option.value}
                  orientation="horizontal"
                  className="items-center gap-3"
                  data-invalid={!!errors.metricAggregation}
                >
                  <RadioGroupItem
                    id={id}
                    value={option.value}
                    aria-invalid={!!errors.metricAggregation}
                  />
                  <FieldLabel htmlFor={id} className="font-normal">
                    {option.label}
                  </FieldLabel>
                </Field>
              );
            })}
          </RadioGroup>
        </FieldContent>
        {errors.metricAggregation && (
          <FieldError errors={[errors.metricAggregation]} />
        )}
      </Field>

      <FieldGroup className="gap-4 md:flex-row md:items-start">
        <Field
          className="md:max-w-xs"
          data-invalid={!!errors.timeframePreset}
        >
          <FieldLabel htmlFor="analytics-timeframe-preset">Zeitraum</FieldLabel>
          <FieldContent>
            <Select
              value={formValues.timeframePreset}
              onValueChange={(value) => {
                const selectedPreset = timeframeOptions.find(
                  (preset) => preset === value
                );

                if (selectedPreset) {
                  setValue('timeframePreset', selectedPreset);
                  if (selectedPreset !== 'custom') {
                    clearErrors(['timeframeFrom', 'timeframeTo']);
                  }
                }
              }}
            >
              <SelectTrigger
                id="analytics-timeframe-preset"
                aria-invalid={!!errors.timeframePreset}
              >
                <SelectValue placeholder="Zeitraum wählen" />
              </SelectTrigger>
              <SelectContent>
                {timeframeOptions.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {timeframeLabel(preset)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
          {errors.timeframePreset && (
            <FieldError errors={[errors.timeframePreset]} />
          )}
        </Field>

        {formValues.timeframePreset === 'custom' ? (
          <Field
            className="flex-1"
            data-invalid={!!errors.timeframeFrom || !!errors.timeframeTo}
          >
            <FieldLabel htmlFor="analytics-timeframe">Von Bis</FieldLabel>
            <FieldContent>
              <DateInput
                id="analytics-timeframe"
                mode="range"
                value={
                  formValues.timeframeFrom || formValues.timeframeTo
                    ? {
                        from: formValues.timeframeFrom,
                        to: formValues.timeframeTo,
                      }
                    : null
                }
                onValueChange={(nextValue) => {
                  setValue('timeframeFrom', nextValue?.from ?? '');
                  setValue('timeframeTo', nextValue?.to ?? '');
                  if (nextValue) {
                    clearErrors(['timeframeFrom', 'timeframeTo']);
                  }
              }}
              aria-invalid={!!errors.timeframeFrom || !!errors.timeframeTo}
              inputClassName="w-full"
            />
          </FieldContent>
            {(errors.timeframeFrom || errors.timeframeTo) && (
              <FieldError
                errors={[errors.timeframeFrom, errors.timeframeTo]}
              />
            )}
          </Field>
        ) : null}
      </FieldGroup>
    </FieldGroup>
  );

  const steps = useMemo(
    () => [
      {
        fields: ['chartType'],
        title: 'Diagrammtyp wählen',
        description: 'Auswahl mit direkter Vorschau.',
        icon: '1',
        component: stepOne,
      },
      {
        fields: [
          'description',
          'dimensionKind',
          'dimensionKey',
          'metricAggregation',
          'timeframePreset',
          'timeframeFrom',
          'timeframeTo',
        ],
        title: 'Diagramm konfigurieren',
        description: 'Feld, Modus und Zeitraum einstellen.',
        icon: '2',
        component: stepTwo,
      },
    ],
    [stepOne, stepTwo]
  );

  const providerKey = `${chart?.id ?? 'new'}-${isOpen ? 'open' : 'closed'}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
        <MultiStepFormProvider key={providerKey} stepsFields={steps}>
          <form
            onSubmit={handleSubmit(handleSave)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <MultiStepFormContent className="min-h-0 gap-4">
              <DialogHeader>
                <DialogTitle>
                  {chart ? 'Diagramm bearbeiten' : 'Diagramm erstellen'}
                </DialogTitle>
                <DialogDescription>
                  <AnalyticsChartStepDescription
                    einsatzPlural={einsatzPlural}
                  />
                </DialogDescription>
              </DialogHeader>

              <FormHeader />

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <AnalyticsChartStepBody />
              </div>

              <div className="bg-background sticky bottom-0 z-10 border-t pt-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => onOpenChange(false)}
                  >
                    Abbrechen
                  </Button>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <PreviousButton variant="outline">Zurück</PreviousButton>
                    <NextButton>Weiter</NextButton>
                    <SubmitButton disabled={isPending}>
                      {chart ? 'Diagramm speichern' : 'Diagramm erstellen'}
                    </SubmitButton>
                  </div>
                </div>
              </div>
            </MultiStepFormContent>
          </form>
        </MultiStepFormProvider>
      </DialogContent>
    </Dialog>
  );
}

function AnalyticsChartStepBody() {
  const { currentStepData } = useMultiStepForm();

  return <div className="space-y-6">{currentStepData.component}</div>;
}

function AnalyticsChartStepDescription({
  einsatzPlural,
}: {
  einsatzPlural: string;
}) {
  const { currentStepIndex } = useMultiStepForm();

  return currentStepIndex === 1
    ? 'Wählen Sie zuerst einen Diagrammtyp mit Vorschau aus.'
    : `Konfigurieren Sie Feld, Auswertungsmodus und Zeitraum für Ihre ${einsatzPlural}.`;
}
