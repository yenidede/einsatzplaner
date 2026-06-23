'use server';

import { startOfDay } from 'date-fns';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { authOptions } from '@/lib/auth.config';
import { hasPermission } from '@/lib/auth/authGuard';
import prisma from '@/lib/prisma';
import {
  buildCalendarSubscriptionUrl,
  buildWebcalUrl,
  createCalendarExport,
  createCalendarExportTemplate,
  deleteCalendarExport,
  deleteCalendarExportTemplate,
  listCalendarExports,
  listCalendarExportTemplates,
  rotateCalendarSubscription,
  setCalendarExportActive,
  updateCalendarExport,
  updateCalendarExportTemplate,
} from './calendarSubscription';
import {
  calendarExportConfigSchema,
  parseCalendarExportConfig,
  type CalendarExportConfig,
  type CalendarExportMode,
} from './config';
import { filterCalendarExportEvents } from './filter';
import { composeCalendarExportEventTitle } from './title';

const exportInputSchema = z.object({
  name: z.string().trim().min(1, 'Der Name ist erforderlich.'),
  config: calendarExportConfigSchema,
});

const exportUpdateInputSchema = exportInputSchema.extend({
  orgId: z.string().uuid('Die Organisation ist ungültig.'),
});

const templateInputSchema = exportInputSchema.extend({
  description: z.string().trim().optional().nullable(),
});

function buildCalendarExportPreviewWhere(
  orgId: string,
  config: CalendarExportConfig,
  ownerUserId: string
): Prisma.einsatzWhereInput {
  const where: Prisma.einsatzWhereInput = { org_id: orgId };

  if (config.futureOnly) {
    where.end = { gte: startOfDay(new Date()) };
  }

  if (!config.includeAllDay) {
    where.all_day = false;
  }

  if (config.categoryIds.length > 0) {
    where.einsatz_to_category = {
      some: {
        category_id: { in: config.categoryIds },
      },
    };
  }

  const statusBranches: Prisma.einsatzWhereInput[] = [];
  if (config.statusIds.length > 0) {
    statusBranches.push({ status_id: { in: config.statusIds } });
  }
  if (config.mode === 'helper' && config.statusPseudo.includes('own')) {
    statusBranches.push({
      einsatz_helper: {
        some: { user_id: ownerUserId },
      },
    });
  }
  if (statusBranches.length > 0) {
    where.OR = statusBranches;
  }

  return where;
}

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Sie sind nicht angemeldet.');
  return session;
}

async function assertReadAccess(orgId: string) {
  const session = await checkUserSession();
  if (!(await hasPermission(session, 'einsaetze:read', orgId))) {
    throw new Error(
      'Keine Berechtigung für Kalenderexporte dieser Organisation.'
    );
  }
  return session;
}

async function assertOrganizationUpdateAccess(orgId: string) {
  const session = await checkUserSession();
  if (!(await hasPermission(session, 'organization:update', orgId))) {
    throw new Error(
      'Keine Berechtigung, Kalenderexport-Vorlagen dieser Organisation zu bearbeiten.'
    );
  }
  return session;
}

async function hasManagementModeAccess(orgId: string) {
  const session = await checkUserSession();
  return (
    (await hasPermission(session, 'einsaetze:create', orgId)) ||
    (await hasPermission(session, 'einsaetze:update', orgId)) ||
    (await hasPermission(session, 'einsaetze:delete', orgId))
  );
}

async function assertModeAccess(orgId: string, mode: CalendarExportMode) {
  if (mode === 'helper') {
    return;
  }

  if (!(await hasManagementModeAccess(orgId))) {
    throw new Error('Keine Berechtigung für Kalenderexporte der Verwaltung.');
  }
}

async function validateConfigReferences(
  orgId: string,
  config: CalendarExportConfig
) {
  const [categoryCount, statusCount] = await Promise.all([
    config.categoryIds.length === 0
      ? Promise.resolve(0)
      : prisma.einsatz_category.count({
        where: {
          id: { in: config.categoryIds },
          org_id: orgId,
        },
      }),
    config.statusIds.length === 0
      ? Promise.resolve(0)
      : prisma.einsatz_status.count({
        where: {
          id: { in: config.statusIds },
        },
      }),
  ]);

  if (categoryCount !== new Set(config.categoryIds).size) {
    throw new Error(
      'Mindestens eine Kategorie gehört nicht zu dieser Organisation.'
    );
  }

  if (statusCount !== new Set(config.statusIds).size) {
    throw new Error('Mindestens ein Status ist nicht verfügbar.');
  }

  if (config.mode === 'verwaltung' && config.statusPseudo.includes('own')) {
    throw new Error('Eigene Einsätze sind nur in der Helferansicht verfügbar.');
  }
}

function toCalendarExportResponse(
  calendarExport: Awaited<ReturnType<typeof listCalendarExports>>[number],
  managementModeAvailable: boolean
) {
  return {
    id: calendarExport.id,
    orgId: calendarExport.org_id,
    organization: calendarExport.organization,
    name: calendarExport.name ?? 'Kalenderexport',
    is_active: calendarExport.is_active,
    token: calendarExport.token,
    webcalUrl: buildWebcalUrl(calendarExport.token),
    httpUrl: buildCalendarSubscriptionUrl(calendarExport.token),
    last_accessed: calendarExport.last_accessed?.toISOString() ?? null,
    created_at: calendarExport.created_at.toISOString(),
    config: calendarExport.parsedConfig,
    modeAvailable:
      calendarExport.parsedConfig.mode === 'helper' || managementModeAvailable,
  };
}

export async function listCalendarExportsAction() {
  const session = await checkUserSession();
  const calendarExports = await listCalendarExports(session.user.id);
  const readableOrgIds = new Set<string>();
  const managementOrgIds = new Set<string>();

  await Promise.all(
    Array.from(new Set(calendarExports.map((item) => item.org_id))).map(
      async (orgId) => {
        if (await hasPermission(session, 'einsaetze:read', orgId)) {
          readableOrgIds.add(orgId);
        }
        if (
          (await hasPermission(session, 'einsaetze:create', orgId)) ||
          (await hasPermission(session, 'einsaetze:update', orgId)) ||
          (await hasPermission(session, 'einsaetze:delete', orgId))
        ) {
          managementOrgIds.add(orgId);
        }
      }
    )
  );

  return calendarExports
    .filter((calendarExport) => readableOrgIds.has(calendarExport.org_id))
    .map((calendarExport) =>
      toCalendarExportResponse(
        calendarExport,
        managementOrgIds.has(calendarExport.org_id)
      )
    );
}

export async function listCalendarExportEligibilityAction() {
  const session = await checkUserSession();
  const orgIds = session.user.orgIds ?? [];

  const organizations = await prisma.organization.findMany({
    where: {
      id: { in: orgIds },
    },
    select: {
      id: true,
      name: true,
      helper_name_singular: true,
      helper_name_plural: true,
      einsatz_name_singular: true,
      einsatz_name_plural: true,
    },
    orderBy: { name: 'asc' },
  });

  const eligibility = await Promise.all(
    organizations.map(async (organization) => {
      const canRead = await hasPermission(
        session,
        'einsaetze:read',
        organization.id
      );

      if (!canRead) {
        return null;
      }

      const canUseManagementMode =
        (await hasPermission(session, 'einsaetze:create', organization.id)) ||
        (await hasPermission(session, 'einsaetze:update', organization.id)) ||
        (await hasPermission(session, 'einsaetze:delete', organization.id));

      return {
        organization,
        modes: canUseManagementMode
          ? (['helper', 'verwaltung'] as const)
          : (['helper'] as const),
      };
    })
  );

  return eligibility.filter(
    (item): item is NonNullable<(typeof eligibility)[number]> => item !== null
  );
}

export async function createCalendarExportAction(
  orgId: string,
  input: z.input<typeof exportInputSchema>
) {
  const session = await assertReadAccess(orgId);
  const parsedInput = exportInputSchema.parse(input);
  await assertModeAccess(orgId, parsedInput.config.mode);
  await validateConfigReferences(orgId, parsedInput.config);

  const calendarExport = await createCalendarExport({
    userId: session.user.id,
    orgId,
    name: parsedInput.name,
    config: parsedInput.config,
  });

  return {
    id: calendarExport.id,
    name: calendarExport.name ?? '',
    token: calendarExport.token,
    webcalUrl: buildWebcalUrl(calendarExport.token),
    httpUrl: buildCalendarSubscriptionUrl(calendarExport.token),
  };
}

export async function updateCalendarExportAction(
  id: string,
  input: z.input<typeof exportUpdateInputSchema>
) {
  const session = await checkUserSession();
  const existing = await prisma.calendar_subscription.findFirst({
    where: { id, user_id: session.user.id },
    select: { org_id: true },
  });

  if (!existing) {
    throw new Error('Kalenderexport wurde nicht gefunden.');
  }

  await assertReadAccess(existing.org_id);
  const parsedInput = exportUpdateInputSchema.parse(input);
  await assertReadAccess(parsedInput.orgId);
  await assertModeAccess(parsedInput.orgId, parsedInput.config.mode);
  await validateConfigReferences(parsedInput.orgId, parsedInput.config);

  const calendarExport = await updateCalendarExport({
    id,
    userId: session.user.id,
    orgId: parsedInput.orgId,
    name: parsedInput.name,
    config: parsedInput.config,
  });

  return {
    id: calendarExport.id,
    name: calendarExport.name ?? '',
    token: calendarExport.token,
    webcalUrl: buildWebcalUrl(calendarExport.token),
    httpUrl: buildCalendarSubscriptionUrl(calendarExport.token),
  };
}

export async function rotateSubscriptionAction(id: string) {
  const session = await checkUserSession();
  const response = await rotateCalendarSubscription(id, session.user.id).catch(
    () => {
      throw new Error('Der Kalender-Link konnte nicht neu generiert werden.');
    }
  );

  return {
    id: response.id,
    token: response.token,
    webcalUrl: buildWebcalUrl(response.token),
    httpUrl: buildCalendarSubscriptionUrl(response.token),
  };
}

export async function setCalendarExportActiveAction(
  id: string,
  isActive: boolean
) {
  const session = await checkUserSession();
  const response = await setCalendarExportActive({
    id,
    userId: session.user.id,
    isActive,
  }).catch(() => {
    throw new Error(
      isActive
        ? 'Der Kalenderexport konnte nicht aktiviert werden.'
        : 'Der Kalenderexport konnte nicht deaktiviert werden.'
    );
  });

  return {
    id: response.id,
    is_active: response.is_active,
  };
}

export async function deleteCalendarExportAction(id: string) {
  const session = await checkUserSession();
  await deleteCalendarExport(id, session.user.id);
  return { id };
}

export async function listCalendarExportTemplatesAction(orgId: string) {
  await assertOrganizationUpdateAccess(orgId);
  const templates = await listCalendarExportTemplates(orgId);
  return templates.map((template) => ({
    id: template.id,
    orgId: template.org_id,
    name: template.name,
    description: template.description,
    config: template.parsedConfig,
    created_at: template.created_at.toISOString(),
    updated_at: template.updated_at?.toISOString() ?? null,
  }));
}

export async function listCompatibleCalendarExportTemplatesAction(
  orgId: string
) {
  await assertReadAccess(orgId);
  const managementModeAvailable = await hasManagementModeAccess(orgId);
  const templates = await listCalendarExportTemplates(orgId);

  return templates
    .filter(
      (template) =>
        template.parsedConfig.mode === 'helper' || managementModeAvailable
    )
    .map((template) => ({
      id: template.id,
      orgId: template.org_id,
      name: template.name,
      description: template.description,
      config: template.parsedConfig,
    }));
}

export async function createCalendarExportTemplateAction(
  orgId: string,
  input: z.input<typeof templateInputSchema>
) {
  await assertOrganizationUpdateAccess(orgId);
  const parsedInput = templateInputSchema.parse(input);
  await validateConfigReferences(orgId, parsedInput.config);

  const template = await createCalendarExportTemplate({
    orgId,
    name: parsedInput.name,
    description: parsedInput.description,
    config: parsedInput.config,
  });

  return {
    id: template.id,
    orgId: template.org_id,
    name: template.name,
    description: template.description,
    config: parseCalendarExportConfig(template.config),
  };
}

export async function updateCalendarExportTemplateAction(
  orgId: string,
  id: string,
  input: z.input<typeof templateInputSchema>
) {
  await assertOrganizationUpdateAccess(orgId);
  const parsedInput = templateInputSchema.parse(input);
  await validateConfigReferences(orgId, parsedInput.config);

  const template = await updateCalendarExportTemplate({
    id,
    orgId,
    name: parsedInput.name,
    description: parsedInput.description,
    config: parsedInput.config,
  });

  return {
    id: template.id,
    orgId: template.org_id,
    name: template.name,
    description: template.description,
    config: parseCalendarExportConfig(template.config),
  };
}

export async function deleteCalendarExportTemplateAction(
  orgId: string,
  id: string
) {
  await assertOrganizationUpdateAccess(orgId);
  await deleteCalendarExportTemplate(id, orgId);
  return { id };
}

export async function getCalendarExportPreviewAction(
  orgId: string,
  config: unknown
) {
  const session = await assertReadAccess(orgId);
  const parsedConfig = calendarExportConfigSchema.parse(config);
  await assertModeAccess(orgId, parsedConfig.mode);
  await validateConfigReferences(orgId, parsedConfig);

  const events = await prisma.einsatz.findMany({
    where: buildCalendarExportPreviewWhere(
      orgId,
      parsedConfig,
      session.user.id
    ),
    orderBy: { start: 'asc' },
    select: {
      id: true,
      title: true,
      start: true,
      end: true,
      all_day: true,
      status_id: true,
      helpers_needed: true,
      einsatz_to_category: {
        select: {
          category_id: true,
          einsatz_category: {
            select: {
              id: true,
              abbreviation: true,
            },
          },
        },
      },
      einsatz_helper: {
        orderBy: {
          joined_at: 'asc',
        },
        select: {
          user_id: true,
          user: {
            select: {
              firstname: true,
              lastname: true,
            },
          },
        },
      },
    },
  });

  const result = filterCalendarExportEvents(
    events,
    parsedConfig,
    session.user.id
  );

  return {
    count: result.events.length,
    trimmedBefore: result.trimmedBefore?.toISOString() ?? null,
    previewEvents: result.events.slice(0, 5).map((event) => ({
      id: event.id,
      title: composeCalendarExportEventTitle({
        title: event.title,
        categoryAbbreviations: event.einsatz_to_category
          .map((category) => category.einsatz_category.abbreviation)
          .filter((abbreviation) => abbreviation !== ''),
        assignedHelperNames: event.einsatz_helper.map((helper) => ({
          firstname: helper.user.firstname,
          lastname: helper.user.lastname,
        })),
        assignedHelpers: event.einsatz_helper.length,
        helpersNeeded: event.helpers_needed,
        config: parsedConfig,
      }),
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      allDay: event.all_day,
    })),
  };
}
