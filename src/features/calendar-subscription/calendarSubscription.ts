import type { Prisma } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import { generatedToken } from '@/lib/token';
import {
  createOwnFutureTemplateConfig,
  getBlankCalendarExportConfig,
  parseCalendarExportConfig,
  type CalendarExportConfig,
} from './config';

type CalendarSubscriptionExecutor = Pick<
  typeof prisma,
  'calendar_subscription' | 'organization' | 'einsatz_status'
>;

type CalendarTemplateExecutor = Pick<typeof prisma, 'calendar_export_template'>;

function toJsonInput(config: CalendarExportConfig): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase('de-AT');
}

function appendNameSuffix(baseName: string, suffix: number) {
  return `${baseName} ${suffix}`;
}

export async function createUniqueCalendarExportName(input: {
  userId: string;
  orgId: string;
  requestedName: string;
}) {
  const baseName = input.requestedName.trim();
  if (!baseName) {
    throw new Error('Der Name ist erforderlich.');
  }

  const existingExports = await prisma.calendar_subscription.findMany({
    where: {
      user_id: input.userId,
      org_id: input.orgId,
    },
    select: { name: true },
  });

  const existingNames = new Set(
    existingExports
      .map((calendarExport) => calendarExport.name)
      .filter((name): name is string => Boolean(name))
      .map(normalizeName)
  );

  if (!existingNames.has(normalizeName(baseName))) {
    return baseName;
  }

  let suffix = 2;
  while (existingNames.has(normalizeName(appendNameSuffix(baseName, suffix)))) {
    suffix += 1;
  }

  return appendNameSuffix(baseName, suffix);
}

export async function calendarExportNameExists(input: {
  userId: string;
  orgId: string;
  name: string;
  excludeId?: string;
}) {
  const normalizedRequestedName = normalizeName(input.name);
  const existingExports = await prisma.calendar_subscription.findMany({
    where: {
      user_id: input.userId,
      org_id: input.orgId,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { name: true },
  });

  return existingExports.some((calendarExport) => {
    if (!calendarExport.name) {
      return false;
    }

    return normalizeName(calendarExport.name) === normalizedRequestedName;
  });
}

export async function listCalendarExports(userId: string) {
  const calendarExports = await prisma.calendar_subscription.findMany({
    where: { user_id: userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          helper_name_singular: true,
          helper_name_plural: true,
          einsatz_name_singular: true,
          einsatz_name_plural: true,
        },
      },
    },
    orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
  });

  return calendarExports.map((calendarExport) => ({
    ...calendarExport,
    parsedConfig: parseCalendarExportConfig(calendarExport.config),
  }));
}

export async function createCalendarExport(input: {
  userId: string;
  orgId: string;
  name: string;
  config: CalendarExportConfig;
}) {
  const uniqueName = await createUniqueCalendarExportName({
    userId: input.userId,
    orgId: input.orgId,
    requestedName: input.name,
  });

  return prisma.calendar_subscription.create({
    data: {
      user_id: input.userId,
      org_id: input.orgId,
      token: generatedToken(24),
      name: uniqueName,
      is_active: true,
      config: toJsonInput(input.config),
    },
  });
}

export async function updateCalendarExport(input: {
  id: string;
  userId: string;
  name: string;
  config: CalendarExportConfig;
}) {
  const existing = await prisma.calendar_subscription.findFirst({
    where: { id: input.id, user_id: input.userId },
    select: { org_id: true },
  });

  if (!existing) {
    throw new Error('Kalenderexport wurde nicht gefunden.');
  }

  const trimmedName = input.name.trim();
  if (
    await calendarExportNameExists({
      userId: input.userId,
      orgId: existing.org_id,
      name: trimmedName,
      excludeId: input.id,
    })
  ) {
    throw new Error('Dieser Name wird bereits verwendet.');
  }

  return prisma.calendar_subscription.update({
    where: { id: input.id, user_id: input.userId },
    data: {
      name: trimmedName,
      config: toJsonInput(input.config),
    },
  });
}

export async function rotateCalendarSubscription(id: string, userId: string) {
  if (!id || !userId) {
    throw new Error(
      'Organisation oder Benutzer konnte nicht zugeordnet werden.'
    );
  }

  return prisma.calendar_subscription.update({
    where: { id, user_id: userId },
    data: { token: generatedToken(24), is_active: true },
  });
}

export async function setCalendarExportActive(input: {
  id: string;
  userId: string;
  isActive: boolean;
}) {
  return prisma.calendar_subscription.update({
    where: { id: input.id, user_id: input.userId },
    data: { is_active: input.isActive },
  });
}

export async function deleteCalendarExport(id: string, userId: string) {
  return prisma.calendar_subscription.delete({
    where: { id, user_id: userId },
  });
}

export async function listCalendarExportTemplates(orgId: string) {
  const templates = await prisma.calendar_export_template.findMany({
    where: { org_id: orgId },
    orderBy: [{ name: 'asc' }],
  });

  return templates.map((template) => ({
    ...template,
    parsedConfig: parseCalendarExportConfig(template.config),
  }));
}

export async function createCalendarExportTemplate(input: {
  orgId: string;
  name: string;
  description?: string | null;
  config: CalendarExportConfig;
}) {
  return prisma.calendar_export_template.create({
    data: {
      org_id: input.orgId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      config: toJsonInput(input.config),
    },
  });
}

export async function updateCalendarExportTemplate(input: {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  config: CalendarExportConfig;
}) {
  return prisma.calendar_export_template.update({
    where: { id: input.id, org_id: input.orgId },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      config: toJsonInput(input.config),
      updated_at: new Date(),
    },
  });
}

export async function deleteCalendarExportTemplate(id: string, orgId: string) {
  return prisma.calendar_export_template.delete({
    where: { id, org_id: orgId },
  });
}

export async function seedDefaultCalendarExportTemplatesForOrg(
  orgId: string,
  executor: CalendarTemplateExecutor = prisma
) {
  await executor.calendar_export_template.createMany({
    data: [
      {
        org_id: orgId,
        name: 'Alle zukünftigen Ereignisse',
        description: null,
        config: toJsonInput({
          ...getBlankCalendarExportConfig('helper'),
          futureOnly: true,
        }),
      },
      {
        org_id: orgId,
        name: 'Nur eigene in der Zukunft',
        description: null,
        config: toJsonInput(createOwnFutureTemplateConfig()),
      },
      {
        org_id: orgId,
        name: 'Alle Ereignisse (Helfer)',
        description: null,
        config: toJsonInput(getBlankCalendarExportConfig('helper')),
      },
      {
        org_id: orgId,
        name: 'Alle Ereignisse (Verwaltung)',
        description: null,
        config: toJsonInput(getBlankCalendarExportConfig('verwaltung')),
      },
    ],
  });
}

export async function getOrCreateCalendarSubscription(
  orgId: string,
  userId: string,
  executor: CalendarSubscriptionExecutor = prisma
) {
  if (!orgId || !userId) {
    throw new Error(
      'Organisation oder Benutzer konnte nicht zugeordnet werden.'
    );
  }

  const existingCalendarSubscription =
    await executor.calendar_subscription.findFirst({
      where: { org_id: orgId, user_id: userId, is_active: true },
    });
  if (existingCalendarSubscription) {
    return existingCalendarSubscription;
  }
  const organization = await executor.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  return executor.calendar_subscription.create({
    data: {
      user_id: userId,
      org_id: orgId,
      token: generatedToken(24),
      name: organization?.name,
      is_active: true,
      config: toJsonInput(getBlankCalendarExportConfig('helper')),
    },
  });
}

export function buildCalendarSubscriptionUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL is not defined');
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}/api/calendar/${token}`;
}

export function buildWebcalUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL is not defined');
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `webcal://${base.replace(/^https?:\/\//, '')}/api/calendar/${token}`;
}
