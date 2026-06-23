import { z } from 'zod';

export const calendarExportModes = ['helper', 'verwaltung'] as const;
export type CalendarExportMode = (typeof calendarExportModes)[number];

export const calendarExportStatusPseudoValues = ['own'] as const;
export type CalendarExportStatusPseudo =
  (typeof calendarExportStatusPseudoValues)[number];

export const calendarExportTitleAdditionKeys = [
  'eventTitle',
  'assignedHelperNames',
  'categories',
  'helperCount',
] as const;
export type CalendarExportTitleAdditionKey =
  (typeof calendarExportTitleAdditionKeys)[number];

const normalizedTimeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);
const defaultCalendarExportTitleAdditions = {
  eventTitle: true,
  assignedHelperNames: false,
  categories: true,
  helperCount: true,
};
const calendarExportTitleAdditionsSchema = z.object({
  eventTitle: z.boolean(),
  assignedHelperNames: z.boolean(),
  categories: z.boolean(),
  helperCount: z.boolean(),
});

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
    titleAdditions: z
      .object({
        eventTitle: z.boolean().optional(),
        assignedHelperNames: z.boolean().optional(),
        categories: z.boolean().optional(),
        helperCount: z.boolean().optional(),
      })
      .transform((titleAdditions) =>
        calendarExportTitleAdditionsSchema.parse({
          ...defaultCalendarExportTitleAdditions,
          ...titleAdditions,
        })
      ),
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
    ...defaultCalendarExportTitleAdditions,
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
