import { z } from 'zod';

export const calendarExportModes = ['helper', 'verwaltung'] as const;
export type CalendarExportMode = (typeof calendarExportModes)[number];

export const calendarExportStatusPseudoValues = ['own'] as const;
export type CalendarExportStatusPseudo =
  (typeof calendarExportStatusPseudoValues)[number];

export const calendarExportTitleAdditionKeys = [
  'categories',
  'helperCount',
] as const;
export type CalendarExportTitleAdditionKey =
  (typeof calendarExportTitleAdditionKeys)[number];

const normalizedTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const calendarExportConfigSchema = z
  .object({
    version: z.literal(1),
    mode: z.enum(calendarExportModes),
    categoryIds: z.array(z.uuid()),
    statusIds: z.array(z.uuid()),
    statusPseudo: z.array(z.enum(calendarExportStatusPseudoValues)),
    timeWindow: z
      .object({
        from: normalizedTimeSchema,
        to: normalizedTimeSchema,
      })
      .nullable(),
    includeAllDay: z.boolean(),
    futureOnly: z.boolean(),
    titleAdditions: z.object({
      categories: z.boolean(),
      helperCount: z.boolean(),
    }),
  })
  .transform((config) =>
    config.mode === 'verwaltung'
      ? {
          ...config,
          statusPseudo: config.statusPseudo.filter((value) => value !== 'own'),
        }
      : config
  );

export type CalendarExportConfig = z.infer<typeof calendarExportConfigSchema>;

export const defaultCalendarExportConfig: CalendarExportConfig = {
  version: 1,
  mode: 'helper',
  categoryIds: [],
  statusIds: [],
  statusPseudo: [],
  timeWindow: null,
  includeAllDay: true,
  futureOnly: false,
  titleAdditions: {
    categories: true,
    helperCount: true,
  },
};

export function parseCalendarExportConfig(
  value: unknown
): CalendarExportConfig {
  const result = calendarExportConfigSchema.safeParse(value);
  return result.success ? result.data : defaultCalendarExportConfig;
}

export function getBlankCalendarExportConfig(
  mode: CalendarExportMode = 'helper'
): CalendarExportConfig {
  return {
    ...defaultCalendarExportConfig,
    mode,
    categoryIds: [],
    statusIds: [],
    statusPseudo: [],
    timeWindow: null,
    titleAdditions: {
      ...defaultCalendarExportConfig.titleAdditions,
    },
  };
}

export function createOpenFutureTemplateConfig(
  openStatusId: string
): CalendarExportConfig {
  return {
    ...getBlankCalendarExportConfig('helper'),
    statusIds: [openStatusId],
    futureOnly: true,
  };
}

export function createOwnFutureTemplateConfig(): CalendarExportConfig {
  return {
    ...getBlankCalendarExportConfig('helper'),
    statusPseudo: ['own'],
    futureOnly: true,
  };
}
