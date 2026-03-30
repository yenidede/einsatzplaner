'use server';

import prisma from '@/lib/prisma';
import type { einsatz as Einsatz } from '@/generated/prisma';
import {
  isFieldTypeKey,
  type FieldTypeKey,
} from '../user_properties/field-type-definitions';
import type {
  EinsatzForCalendar,
  EinsatzCreate,
  EinsatzDetailed,
  EinsatzDetailedForCalendar,
  EinsatzListCustomFieldMeta,
  EinsatzListCustomFieldValue,
  EinsatzListItem,
} from '@/features/einsatz/types';
import {
  addMonths,
  addYears,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import type { PermissionType } from '@/lib/auth/permissions';

import { ValidateEinsatzCreate } from './validation-service';
import z from 'zod';
import { detectChangeTypes, getAffectedUserIds } from '../activity_log/utils';
import { createChangeLogAuto } from '../activity_log/activity_log-dal';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { StatusValuePairs } from '@/components/event-calendar/constants';
import { ChangeTypeIds } from '../activity_log/changeTypeIds';
import { checkEinsatzRequirementsAfterAssignment } from '@/lib/email/email-helpers';

// Helper type for conflict information
export type EinsatzConflict = {
  userId: string;
  userName: string;
  conflictingEinsatz: {
    id: string;
    title: string;
    start: Date;
    end: Date;
  };
};

// Response type for update operations that includes conflicts
export type EinsatzUpdateResponse = {
  einsatz?: Einsatz;
  conflicts: EinsatzConflict[];
};

// Response type for create operations that includes conflicts
export type EinsatzCreateResponse = {
  einsatz?: Einsatz;
  conflicts: EinsatzConflict[];
};

type AuthSession = Awaited<ReturnType<typeof requireAuth>>['session'];

async function hasOrgPermission(
  session: AuthSession,
  orgId: string,
  permission: PermissionType
): Promise<boolean> {
  if (!session.user.orgIds.includes(orgId)) {
    return false;
  }

  return hasPermission(session, permission, orgId);
}

async function assertOrgPermission(
  session: AuthSession,
  orgId: string,
  permission: PermissionType
): Promise<void> {
  if (!(await hasOrgPermission(session, orgId, permission))) {
    throw new ForbiddenError('Fehlende Berechtigungen für diese Organisation');
  }
}

/**
 * Check if users have conflicting time entries with an Einsatz
 * @param userIds Array of user IDs to check
 * @param start Start time of the Einsatz
 * @param end End time of the Einsatz
 * @param exclude Optional ID of an Einsatz to exclude or true to exclude all Einsätze
 * @returns Array of conflicts found
 */
async function checkEinsatzConflicts(
  userIds: string[],
  start: Date,
  end: Date,
  exclude: string | boolean = false
): Promise<EinsatzConflict[]> {
  if (userIds.length === 0) {
    return [];
  }

  if (exclude === true) {
    return [];
  }

  // Find all Einsätze assignments for these users that overlap with the given time range
  const conflictingAssignments = await prisma.einsatz_helper.findMany({
    where: {
      user_id: { in: userIds },
      einsatz: {
        id: exclude ? { not: exclude } : undefined,
        OR: [
          // Einsatz starts during the time range
          {
            start: {
              gte: start,
              lt: end,
            },
          },
          // Einsatz ends during the time range
          {
            end: {
              gt: start,
              lte: end,
            },
          },
          // Einsatz completely encompasses the time range
          {
            start: {
              lte: start,
            },
            end: {
              gte: end,
            },
          },
        ],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
      einsatz: {
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
        },
      },
    },
  });

  return conflictingAssignments.map((assignment) => ({
    userId: assignment.user_id,
    userName: `${assignment.user.firstname} ${assignment.user.lastname}`,
    conflictingEinsatz: {
      id: assignment.einsatz.id,
      title: assignment.einsatz.title,
      start: assignment.einsatz.start,
      end: assignment.einsatz.end,
    },
  }));
}

export async function getEinsatzWithDetailsById(
  id: string
): Promise<EinsatzDetailed | null | Response> {
  const { session } = await requireAuth();
  if (!isValidUuid(id)) {
    throw new BadRequestError('Invalid ID');
  }

  const einsaetzeFromDb = await getEinsatzWithDetailsByIdFromDb(id);

  if (!einsaetzeFromDb) return null;

  if (!(await hasOrgPermission(session, einsaetzeFromDb.org_id, 'einsaetze:read'))) {
    return new Response(`Unauthorized to access Einsatz with ID ${id}`, {
      status: 403,
    });
  }

  // Destructure to avoid leaking raw relation arrays in the DTO
  const {
    einsatz_status,
    einsatz_helper,
    einsatz_to_category,
    change_log,
    einsatz_field,
    einsatz_user_property,
    ...rest
  } = einsaetzeFromDb;

  return {
    ...rest,
    einsatz_status,
    assigned_users: Array.from(
      new Set(einsatz_helper.map((helper) => helper.user_id))
    ),
    einsatz_fields: einsatz_field.map((field) => ({
      id: field.id,
      field_name: field.field.name,
      einsatz_id: field.einsatz_id,
      field_id: field.field_id,
      value: field.value,
      group_name: field.field.group_name,
      field_type: { datatype: field.field.type?.datatype ?? null },
    })),
    categories: einsatz_to_category.map((cat) => cat.einsatz_category.id),
    user_properties: einsatz_user_property.map((prop) => ({
      user_property_id: prop.user_property_id,
      is_required: prop.is_required,
      min_matching_users: prop.min_matching_users,
    })),
    change_log: change_log.map((log) => ({
      id: log.id,
      einsatz_id: log.einsatz_id,
      user_id: log.user_id,
      type_id: log.type_id,
      created_at: log.created_at,
      affected_user: log.affected_user,
      user: log.user
        ? {
          id: log.user.id,
          firstname: log.user.firstname,
          lastname: log.user.lastname,
        }
        : null,
    })),
  };
}

export async function getEinsatzRealtimeMetadataById(id: string): Promise<{
  id: string;
  org_id: string;
  start: Date;
  end: Date;
} | null | Response> {
  const { session } = await requireAuth();

  if (!isValidUuid(id)) {
    throw new BadRequestError('Invalid ID');
  }

  const einsatz = await prisma.einsatz.findUnique({
    where: {
      id,
      organization: {
        user_organization_role: { some: { user_id: session.user.id } },
      },
    },
    select: {
      id: true,
      org_id: true,
      start: true,
      end: true,
    },
  });

  if (!einsatz) {
    return null;
  }

  if (!(await hasOrgPermission(session, einsatz.org_id, 'einsaetze:read'))) {
    return new Response(`Unauthorized to access Einsatz with ID ${id}`, {
      status: 403,
    });
  }

  return einsatz;
}

export async function getAllEinsaetze(org_ids: string[]) {
  const { session } = await requireAuth();
  if (!org_ids || org_ids.length === 0) {
    return [];
  }

  if (
    !(await hasPermission(
      session,
      'einsaetze:read',
      session.user.activeOrganization?.id
    ))
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return getAllEinsaetzeFromDb(org_ids, session.user.id);
}

export async function getAllEinsaetzeForCalendar(org_ids?: string[]) {
  const { session, userIds } = await requireAuth();
  if (
    !(await hasPermission(
      session,
      'einsaetze:read',
      session.user.activeOrganization?.id
    ))
  ) {
    return new Response('Unauthorized', { status: 403 });
  }

  // Nutze User's orgIds als Default wenn keine org_ids übergeben
  const userOrgIds = userIds?.orgIds || (userIds?.orgId ? [userIds.orgId] : []);
  const filterOrgIds = org_ids && org_ids.length > 0 ? org_ids : userOrgIds;

  return getAllEinsatzeForCalendarFromDb(filterOrgIds);
}

export async function getEinsatzForCalendar(id: string) {
  const { session } = await requireAuth();
  if (!isValidUuid(id)) {
    return new Response('Invalid ID', { status: 400 });
  }

  const einsatz = await prisma.einsatz.findUnique({
    where: { id },
    select: { org_id: true },
  });

  if (!einsatz) {
    return null;
  }

  if (!(await hasOrgPermission(session, einsatz.org_id, 'einsaetze:read'))) {
    return new Response('Unauthorized', { status: 403 });
  }

  return getEinsatzForCalendarFromDb(id);
}

export async function getDetailedEinsaetzeForCalendarRange(
  org_ids: string[],
  focusDate: Date
): Promise<EinsatzDetailedForCalendar[] | Response> {
  const { session, userIds } = await requireAuth();
  if (
    !(await hasPermission(
      session,
      'einsaetze:read',
      session.user.activeOrganization?.id
    ))
  ) {
    return new Response('Unauthorized', { status: 403 });
  }
  const userOrgIds = userIds?.orgIds ?? (userIds?.orgId ? [userIds.orgId] : []);
  const filterOrgIds = org_ids.length > 0 ? org_ids : userOrgIds;
  const rangeStart = startOfMonth(subMonths(focusDate, 1));
  const rangeEnd = endOfMonth(addMonths(focusDate, 1));
  const rows = await getDetailedEinsaetzeForCalendarRangeFromDb(
    filterOrgIds,
    rangeStart,
    rangeEnd
  );
  return rows.map((row) => mapRawEinsatzToDetailedForCalendar(row));
}

/** All future events from today onwards (for agenda view). Uses same DB helper as calendar range. */
export async function getDetailedEinsaetzeForAgenda(
  org_ids: string[]
): Promise<EinsatzDetailedForCalendar[] | Response> {
  const { session, userIds } = await requireAuth();
  if (
    !(await hasPermission(
      session,
      'einsaetze:read',
      session.user.activeOrganization?.id
    ))
  ) {
    return new Response('Unauthorized', { status: 403 });
  }
  const userOrgIds = userIds?.orgIds ?? (userIds?.orgId ? [userIds.orgId] : []);
  const filterOrgIds = org_ids.length > 0 ? org_ids : userOrgIds;
  const rangeStart = startOfDay(new Date());
  const rangeEnd = endOfMonth(addYears(rangeStart, 2));
  const rows = await getDetailedEinsaetzeForCalendarRangeFromDb(
    filterOrgIds,
    rangeStart,
    rangeEnd
  );
  return rows.map((row) => mapRawEinsatzToDetailedForCalendar(row));
}

/**
 * Builds a table-ready list of Einsätze for the specified organizations.
 *
 * @param active_org_ids - Organization IDs to filter by; when empty, the current user's organization IDs are used
 * @returns A list of `EinsatzListItem` objects containing einsatz data plus computed helper names, category labels, and custom field data
 */
export async function getEinsaetzeForTableView(
  active_org_ids: string[]
): Promise<EinsatzListItem[]> {
  const { session } = await requireAuth();

  const userOrgIds = session.user.orgIds;
  const memberOrgIds =
    active_org_ids.length > 0
      ? active_org_ids.filter((orgId) => userOrgIds.includes(orgId))
      : userOrgIds;

  if (memberOrgIds.length === 0) {
    return [];
  }

  const readableOrgIds = (
    await Promise.all(
      memberOrgIds.map(async (orgId) =>
        (await hasPermission(session, 'einsaetze:read', orgId)) ? orgId : null
      )
    )
  ).filter((orgId): orgId is string => orgId !== null);

  if (readableOrgIds.length === 0) {
    return [];
  }

  const einsaetzeFromDb = await prisma.einsatz.findMany({
    where: {
      org_id: {
        in: readableOrgIds,
      },
    },
    include: {
      einsatz_status: true,
      organization: { select: { id: true, name: true } },
      einsatz_helper: {
        select: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      einsatz_to_category: {
        include: {
          einsatz_category: true,
        },
      },
      einsatz_field: {
        include: {
          field: {
            select: {
              name: true,
              group_name: true,
              allowed_values: true,
              type: {
                select: {
                  name: true,
                  datatype: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
        },
      },
      einsatz_template: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          einsatz_helper: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  const mapped: EinsatzListItem[] = einsaetzeFromDb.map((einsatz) => {
    const helperUsers = Array.from(
      new Map(
        einsatz.einsatz_helper.map((helper) => [helper.user.id, helper.user])
      ).values()
    );

    const helperNames = helperUsers
      .map((helper) =>
        [helper.firstname, helper.lastname]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .trim()
      )
      .filter((name) => name.length > 0);

    const categoryLabels = Array.from(
      new Set(
        einsatz.einsatz_to_category
          .map((category) => {
            const value = category.einsatz_category.value.trim();
            const abbreviation = category.einsatz_category.abbreviation.trim();

            return abbreviation ? `${value} (${abbreviation})` : value;
          })
          .filter((label) => label.length > 0)
      )
    );

    const { customFields, customFieldMeta } = mapCustomFields(
      einsatz.einsatz_field
    );

    return {
      id: einsatz.id,
      created_at: einsatz.created_at,
      title: einsatz.title,
      updated_at: einsatz.updated_at,
      start: einsatz.start,
      participant_count: einsatz.participant_count,
      price_per_person: einsatz.price_per_person,
      total_price: einsatz.total_price,
      org_id: einsatz.org_id,
      created_by: einsatz.created_by,
      template_id: einsatz.template_id,
      all_day: einsatz.all_day,
      end: einsatz.end,
      helpers_needed: einsatz.helpers_needed,
      status_id: einsatz.status_id,
      anmerkung: einsatz.anmerkung,
      organization_name: einsatz.organization.name,
      created_by_name: einsatz.user
        ? [einsatz.user.firstname, einsatz.user.lastname]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .trim() || null
        : null,
      template_name: einsatz.einsatz_template?.name ?? null,
      status_verwalter_text: einsatz.einsatz_status.verwalter_text,
      status_helper_text: einsatz.einsatz_status.helper_text,
      status_verwalter_color: einsatz.einsatz_status.verwalter_color,
      status_helper_color: einsatz.einsatz_status.helper_color,
      category_labels: categoryLabels,
      category_display: categoryLabels.join(', '),
      helper_names: helperNames,
      helper_display: helperNames.join(', '),
      helper_count: einsatz._count?.einsatz_helper ?? einsatz.einsatz_helper.length,
      custom_fields: customFields,
      custom_field_meta: customFieldMeta,
    };
  });

  return mapped;
}

/**
 * Builds custom-field values and metadata for the list view.
 *
 * @param fields - Custom field entries including field metadata such as name, group name, and datatype
 * @returns An object containing the flattened custom-field values keyed by a formatted field-name key and the metadata needed to render matching columns
 */
function mapCustomFields(
  fields: Array<{
    id: string;
    einsatz_id: string;
    field_id: string;
    value: string | null;
    field: {
      name: string | null;
      group_name: string | null;
      allowed_values: string[];
      type: {
        datatype: string | null;
      } | null;
    };
  }>
): {
  customFields: Record<string, EinsatzListCustomFieldValue>;
  customFieldMeta: EinsatzListCustomFieldMeta[];
} {
  const customFields: Record<string, EinsatzListCustomFieldValue> = {};
  const customFieldMeta: EinsatzListCustomFieldMeta[] = [];

  for (const fieldEntry of fields) {
    const groupName = fieldEntry.field.group_name?.trim() || null;
    const fieldName = fieldEntry.field.name?.trim() || null;
    const label =
      fieldName ?? (groupName ? `Eigenes Feld (${groupName})` : 'Eigenes Feld');
    const key = formatCustomFieldKey(label);

    customFields[key] = normalizeCustomFieldValue(
      fieldEntry.field.type?.datatype ?? null,
      fieldEntry.value
    );
    customFieldMeta.push({
      key,
      label,
      datatype: fieldEntry.field.type?.datatype ?? null,
      group_name: groupName,
      allowed_values: fieldEntry.field.allowed_values,
    });
  }

  return { customFields, customFieldMeta };
}

function normalizeCustomFieldValue(
  datatype: string | null,
  value: string | null
): EinsatzListCustomFieldValue {
  const normalizedValue = normalizeTextValue(value);

  if (normalizedValue === null) {
    return null;
  }

  const fieldType = normalizeFieldType(datatype);

  if (fieldType === null) {
    return normalizedValue;
  }

  switch (fieldType) {
    case 'text':
    case 'phone':
    case 'mail':
    case 'group':
    case 'select':
    case 'time':
      return normalizeStringLikeFieldValue(fieldType, normalizedValue);
    case 'number':
    case 'currency':
      return normalizeNumericFieldValue(normalizedValue);
    case 'date':
      return normalizeDateFieldValue(normalizedValue);
    case 'boolean':
      return normalizeBooleanFieldValue(normalizedValue);
    default:
      return normalizedValue;
  }
}

function normalizeFieldType(datatype: string | null): FieldTypeKey | null {
  if (!datatype) {
    return null;
  }

  return isFieldTypeKey(datatype) ? datatype : null;
}

function normalizeTextValue(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
}

function normalizeStringLikeFieldValue(
  datatype: Extract<FieldTypeKey, 'text' | 'phone' | 'mail' | 'group' | 'select' | 'time'>,
  value: string
): string {
  switch (datatype) {
    default:
      return value;
    case 'mail':
      return value.toLowerCase();
    case 'time':
      return normalizeTimeFieldValue(value);
  }
}

function normalizeNumericFieldValue(value: string): number | string {
  const normalizedNumber = Number(value.replace(',', '.'));
  return Number.isFinite(normalizedNumber) ? normalizedNumber : value;
}

function normalizeBooleanFieldValue(value: string): string {
  const normalizedValue = value.toLowerCase();

  if (['true', '1', 'yes', 'ja', 'on'].includes(normalizedValue)) {
    return 'true';
  }

  if (['false', '0', 'no', 'nein', 'off'].includes(normalizedValue)) {
    return 'false';
  }

  return value;
}

function normalizeDateFieldValue(value: string): Date | string {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const numericYear = Number(year);
    const numericMonth = Number(month);
    const numericDay = Number(day);
    const dateValue = new Date(
      numericYear,
      numericMonth - 1,
      numericDay
    );

    if (
      Number.isNaN(dateValue.getTime()) ||
      dateValue.getFullYear() !== numericYear ||
      dateValue.getMonth() + 1 !== numericMonth ||
      dateValue.getDate() !== numericDay
    ) {
      return value;
    }

    return dateValue;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? value : dateValue;
}

function normalizeTimeFieldValue(value: string): string {
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);

  if (!timeMatch) {
    return value;
  }

  const [, hours, minutes] = timeMatch;
  return `${hours.padStart(2, '0')}:${minutes}`;
}

/**
 * Formats a custom field key by normalizing the label and replacing special characters.
 *
 * @param label - The label to format
 * @returns The formatted custom field key
 */
function formatCustomFieldKey(label: string): string {
  const normalizedLabel = label
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `cf-${normalizedLabel || 'eigenes-feld'}`;
}

/**
 * Fetch templates for an organization, including each template's icon URL and template fields with their field type name.
 *
 * @param org_id - Optional organization id to fetch templates for; if omitted, uses the user's single organization when possible
 * @returns Template records for the resolved organization or a `Response` with status 403 when the caller lacks permission
 * @throws {BadRequestError} When no organization can be resolved from `org_id` and the current user's memberships
 */
export async function getAllTemplatesWithFields(org_id?: string) {
  const { session, userIds } = await requireAuth();

  if (
    !(await hasPermission(
      session,
      'templates:read',
      session.user.activeOrganization?.id
    ))
  ) {
    return new Response('Unauthorized', { status: 403 });
  }

  // Verwende org_id oder erste Organisation des Users
  const userOrgIds = userIds?.orgIds || (userIds?.orgId ? [userIds.orgId] : []);
  const useOrgId =
    org_id || (userOrgIds.length === 1 ? userOrgIds[0] : undefined);

  if (!useOrgId) {
    throw new BadRequestError('Organisation muss angegeben werden');
  }

  // Prüfe ob User Zugriff auf diese Organisation hat
  if (!userOrgIds.includes(useOrgId)) {
    return new Response(
      `Unauthorized to access templates for org ${useOrgId}`,
      {
        status: 403,
      }
    );
  }

  return prisma.einsatz_template.findMany({
    where: {
      org_id: useOrgId,
    },
    orderBy: { name: 'asc' },
    include: {
      template_icon: {
        select: {
          icon_url: true,
        },
      },
      template_field: {
        select: {
          field: {
            include: {
              type: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function createEinsatz({
  data,
  disableTimeConflicts = false,
}: {
  data: EinsatzCreate;
  disableTimeConflicts?: boolean;
}): Promise<EinsatzCreateResponse> {
  const { session, userIds } = await requireAuth();

  const userOrgIds = userIds?.orgIds || (userIds?.orgId ? [userIds.orgId] : []);
  const useOrgId =
    data.org_id || (userOrgIds.length === 1 ? userOrgIds[0] : undefined);

  if (!useOrgId) {
    throw new BadRequestError('Organisation muss angegeben werden');
  }

  const einsatzWithAuth = {
    ...data,
    created_by: userIds.userId,
    org_id: useOrgId,
  };

  await assertOrgPermission(session, useOrgId, 'einsaetze:create');

  // Check for conflicts when creating with assigned users (unless disabled)
  let conflicts: EinsatzConflict[] = [];
  if (
    !disableTimeConflicts &&
    data.assignedUsers &&
    data.assignedUsers.length > 0
  ) {
    conflicts = await checkEinsatzConflicts(
      data.assignedUsers,
      data.start,
      data.end
    );

    // Return early if conflicts exist - do not create the einsatz
    if (conflicts.length > 0) {
      return {
        conflicts,
      };
    }
  }

  const createdEinsatz = await createEinsatzInDb({ data: einsatzWithAuth });

  if (createdEinsatz.id && userIds.userId) {
    try {
      const changeTypeNames = detectChangeTypes(
        true,
        [],
        data.assignedUsers || [],
        userIds.userId
      );

      const affectedUserIds = getAffectedUserIds([], data.assignedUsers || []);

      const changeLogData = changeTypeNames
        .map((typeName) => {
          const typeId = ChangeTypeIds[typeName];
          const affectedUserId =
            typeName === 'E-Erstellt' ? null : (affectedUserIds[0] ?? null);

          if (!typeId || !isValidUuid(typeId)) {
            console.warn(
              'Skipping change log entry due to invalid change type ID:',
              typeName,
              typeId
            );
            return null;
          }

          if (affectedUserId && !isValidUuid(affectedUserId)) {
            console.warn(
              'Skipping change log entry due to invalid affected user id:',
              affectedUserId
            );
            return null;
          }

          return {
            einsatz_id: createdEinsatz.id,
            user_id: userIds.userId,
            type_id: typeId,
            affected_user: affectedUserId,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (changeLogData.length > 0) {
        await prisma.change_log.createMany({
          data: changeLogData,
        });
      }
    } catch (error) {
      console.error('Failed to create activity logs:', error);
    }
  }

  return {
    einsatz: createdEinsatz,
    conflicts: [],
  };
}

export async function updateEinsatzTime(data: {
  id: string;
  start: Date;
  end: Date;
  disableTimeConflicts?: boolean;
}): Promise<EinsatzUpdateResponse> {
  const { session } = await requireAuth();

  const dataSchema = z.object({
    id: z.string(),
    start: z.date(),
    end: z.date(),
    disableTimeConflicts: z.boolean().optional(),
  });

  const {
    id,
    start,
    end,
    disableTimeConflicts = false,
  } = dataSchema.parse(data);

  // Get assigned users for this Einsatz
  const existingEinsatz = await prisma.einsatz.findUnique({
    where: { id },
    select: {
      org_id: true,
      einsatz_helper: {
        select: { user_id: true },
      },
    },
  });

  if (!existingEinsatz) {
    throw new NotFoundError(`Einsatz with ID ${id} not found`);
  }

  await assertOrgPermission(session, existingEinsatz.org_id, 'einsaetze:update');

  let conflicts: EinsatzConflict[] = [];

  if (
    !disableTimeConflicts &&
    existingEinsatz &&
    existingEinsatz.einsatz_helper.length > 0
  ) {
    const assignedUserIds = Array.from(
      new Set(existingEinsatz.einsatz_helper.map((helper) => helper.user_id))
    );

    // Check if the new time causes conflicts with already assigned users
    conflicts = await checkEinsatzConflicts(assignedUserIds, start, end, id);

    // Return early if conflicts exist - do not update the time
    if (conflicts.length > 0) {
      return {
        conflicts,
      };
    }
  }

  const einsatz = await prisma.einsatz.update({
    where: { id },
    data: {
      start,
      end,
      updated_at: new Date(),
    },
  });

  if (session.user.id) {
    try {
      const changeLog = await createChangeLogAuto({
        einsatzId: id,
        userId: session.user.id,
        typeId: ChangeTypeIds['E-Bearbeitet'],
      });

      if (!changeLog) {
        throw new Error(
          `Aktivitätenprotokoll für die Zeitänderung von Einsatz ${id} konnte nicht erstellt werden.`
        );
      }
    } catch (error) {
      console.error('Failed to create audit log for time update', {
        einsatzId: id,
        userId: session.user.id,
        typeId: ChangeTypeIds['E-Bearbeitet'],
        error,
      });
      throw new Error(
        `Aktivitätenprotokoll für die Zeitänderung von Einsatz ${id} konnte nicht erstellt werden.`
      );
    }
  }

  return {
    einsatz,
    conflicts: [],
  };
}

export async function toggleUserAssignmentToEinsatz(
  einsatzId: string
): Promise<Einsatz | { id: string; title: string; deleted: true }> {
  // Adds the user if he isnt already assigned, removes him otherwise
  const { session } = await requireAuth();

  if (!session?.user.id) {
    throw new Response('User ID is required', { status: 400 });
  }

  const existingEinsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    select: {
      id: true,
      title: true,
      org_id: true,
      start: true,
      end: true,
      einsatz_helper: { select: { user_id: true } },
      helpers_needed: true,
    },
  });

  if (!existingEinsatz) {
    throw new NotFoundError(`Einsatz with ID ${einsatzId} not found`);
  }

  const isSignedInUserAssigned = existingEinsatz.einsatz_helper.some(
    (helper) => helper.user_id === session.user.id
  );

  await assertOrgPermission(
    session,
    existingEinsatz.org_id,
    isSignedInUserAssigned ? 'einsaetze:leave' : 'einsaetze:join'
  );

  // Check for conflicts only when assigning (not when removing)
  if (!isSignedInUserAssigned) {
    const conflicts = await checkEinsatzConflicts(
      [session.user.id],
      existingEinsatz.start,
      existingEinsatz.end,
      einsatzId
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      throw new BadRequestError(
        `Sie sind bereits für einen anderen Einsatz in diesem Zeitraum eingeteilt: "${conflict.conflictingEinsatz.title}" (${conflict.conflictingEinsatz.start.toLocaleString('de-AT')} - ${conflict.conflictingEinsatz.end.toLocaleString('de-AT')})`
      );
    }
  }

  const addOrRemoveOne = isSignedInUserAssigned ? -1 : 1;

  const newStatusId =
    existingEinsatz.helpers_needed >
      existingEinsatz.einsatz_helper.length + addOrRemoveOne
      ? 'bb169357-920b-4b49-9e3d-1cf489409370' // offen
      : '15512bc7-fc64-4966-961f-c506a084a274'; // vergeben

  let result: Einsatz;

  if (isSignedInUserAssigned) {
    // USER IS ALREADY ASSIGNED → REMOVE THEM
    result = await prisma.einsatz.update({
      where: {
        id: einsatzId,
        organization: {
          user_organization_role: {
            some: {
              user_id: session.user.id,
            },
          },
        },
      },
      data: {
        einsatz_helper: {
          deleteMany: {
            user_id: session.user.id,
          },
        },
        status_id: newStatusId,
      },
    });

    try {
      await createChangeLogAuto({
        einsatzId: einsatzId,
        userId: session.user.id,
        typeId: ChangeTypeIds['N-Abgesagt'],
        affectedUserId: session.user.id,
      });
    } catch (error) {
      console.error('Failed to create activity log for unassignment:', error);
    }
  } else {
    // USER IS NOT ASSIGNED → ADD THEM
    result = await prisma.einsatz.update({
      where: {
        id: einsatzId,
        organization: {
          user_organization_role: {
            some: {
              user_id: session.user.id,
            },
          },
        },
      },
      data: {
        einsatz_helper: {
          create: {
            user: { connect: { id: session.user.id } },
          },
        },
        status_id: newStatusId,
      },
    });

    // **NEU: Activity Log für Eintragen erstellen**
    try {
      await createChangeLogAuto({
        einsatzId: einsatzId,
        userId: session.user.id,
        typeId: ChangeTypeIds['N-Eingetragen'],
        affectedUserId: session.user.id, // as the user is assigning themselves they are also the affected user
      });
    } catch (error) {
      console.error('Failed to create activity log for assignment:', error);
    }

    try {
      await checkEinsatzRequirementsAfterAssignment(einsatzId);
    } catch (error) {
      console.error('Failed to check einsatz requirements and notify:', error);
    }
  }

  return result;
}

export async function updateEinsatz({
  data,
  disableTimeConflicts = false,
}: {
  data: Partial<EinsatzCreate>;
  disableTimeConflicts?: boolean;
}): Promise<EinsatzUpdateResponse> {
  const { session } = await requireAuth();

  if (data.template_id && false) {
    // TODO implement server side validation
    await ValidateEinsatzCreate(data as EinsatzCreate);
  }
  const {
    id,
    categories,
    einsatz_fields,
    assignedUsers,
    userProperties,
    ...updateData
  } = data;

  if (!id) {
    throw new BadRequestError('Einsatz must have an id for update');
  }

  // Prüfe ob Einsatz existiert und User Zugriff hat
  const existingEinsatz = await prisma.einsatz.findUnique({
    where: { id },
    select: {
      org_id: true,
      start: true,
      end: true,
      template_id: true,
    },
  });

  if (!existingEinsatz) {
    throw new NotFoundError(`Einsatz with ID ${id} not found`);
  }

  await assertOrgPermission(session, existingEinsatz.org_id, 'einsaetze:update');

  // Check for conflicts when assigning users (unless disabled)
  let conflicts: EinsatzConflict[] = [];
  if (!disableTimeConflicts && assignedUsers && assignedUsers.length > 0) {
    // Use the new start/end times if provided, otherwise use existing ones
    const checkStart = updateData.start || existingEinsatz.start;
    const checkEnd = updateData.end || existingEinsatz.end;

    conflicts = await checkEinsatzConflicts(
      assignedUsers,
      checkStart,
      checkEnd,
      id
    );

    // Return early if conflicts exist - do not update the einsatz
    if (conflicts.length > 0) {
      return {
        conflicts,
      };
    }
  }

  try {
    const einsatz = await prisma.einsatz.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date(),
        einsatz_to_category: {
          // delete all existing categories and add the new ones

          ...(categories && {
            deleteMany: {},
            create: categories.map((category) => ({
              einsatz_category: { connect: { id: category } },
            })),
          }),
        },
        einsatz_field: {
          ...(einsatz_fields && {
            deleteMany: {},
            create: einsatz_fields.map((field) => ({
              field: { connect: { id: field.field_id } },
              value: field.value,
            })),
          }),
        },
        einsatz_helper: {
          ...(assignedUsers && {
            deleteMany: {},
            create: (assignedUsers ?? []).map((userId) => ({
              user: { connect: { id: userId } },
            })),
          }),
        },
        einsatz_user_property: {
          ...(userProperties && {
            deleteMany: {},
            create: userProperties.map((propId) => ({
              user_property: { connect: { id: propId.user_property_id } },
              is_required: propId.is_required,
              min_matching_users: propId.min_matching_users ?? null,
            })),
          }),
        },
      },
    });

    return {
      einsatz,
      conflicts: [],
    };
  } catch (error) {
    throw new Response(`Failed to update Einsaetze with ID ${id}: ${error}`, {
      status: 500,
    });
  }
}

export async function updateEinsatzStatus(
  einsatzId: string,
  statusId: string
): Promise<Einsatz> {
  const { session } = await requireAuth();

  const existingEinsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    select: { id: true, org_id: true },
  });

  if (!existingEinsatz) {
    throw new NotFoundError(`Einsatz with ID ${einsatzId} not found`);
  }

  await assertOrgPermission(session, existingEinsatz.org_id, 'einsaetze:update');

  const updatedEinsatz = await prisma.einsatz.update({
    where: { id: einsatzId },
    data: {
      status_id: statusId,
      updated_at: new Date(),
    },
  });

  if (statusId === StatusValuePairs.vergeben_bestaetigt && session?.user?.id) {
    await createChangeLogAuto({
      einsatzId,
      userId: session.user.id,
      typeId: ChangeTypeIds['E-Bestaetigt'],
    });
  }

  return updatedEinsatz;
}

export async function deleteEinsatzById(einsatzId: string): Promise<void> {
  const { session } = await requireAuth();

  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    select: { id: true, org_id: true },
  });

  if (!einsatz) {
    throw new NotFoundError(`Einsatz with ID ${einsatzId} not found`);
  }

  await assertOrgPermission(session, einsatz.org_id, 'einsaetze:delete');

  try {
    await prisma.einsatz.delete({
      where: {
        id: einsatz.id,
      },
    });
  } catch (error) {
    throw new Response(
      `Failed to delete Einsaetze with ID ${einsatzId}: ${error}`,
      { status: 500 }
    );
  }
}

export async function deleteEinsaetzeByIds(
  einsatzIds: string[]
): Promise<void> {
  const { session } = await requireAuth();

  const einsatz = await prisma.einsatz.findMany({
    where: { id: { in: einsatzIds } },
    select: { id: true, org_id: true },
  });
  if (!einsatz || einsatz.length === 0) {
    throw new BadRequestError(`No Einsaetze found: ${einsatzIds.join(', ')}`);
  }

  await Promise.all(
    einsatz.map(async (entry) => {
      await assertOrgPermission(session, entry.org_id, 'einsaetze:delete');
    })
  );

  try {
    await prisma.einsatz.deleteMany({
      where: {
        id: { in: einsatzIds },
      },
    });
  } catch (error) {
    throw new BadRequestError(
      `Failed to delete Einsaetze with IDs ${einsatzIds.join(', ')}: ${error}`
    );
  }
}

async function createEinsatzInDb({
  data,
}: {
  data: EinsatzCreate;
}): Promise<Einsatz> {
  const {
    title,
    start,
    end,
    org_id,
    created_by,
    helpers_needed,
    categories,
    einsatz_fields,
    assignedUsers = [],
    userProperties,
    status_id = 'offen',
    template_id = null,
    all_day = false,
  } = data;

  return prisma.einsatz.create({
    data: {
      title,
      start,
      end,
      org_id,
      created_by,
      helpers_needed,
      all_day,
      einsatz_to_category: {
        create:
          categories?.map((category) => ({
            einsatz_category: { connect: { id: category } },
          })) || [],
      },
      einsatz_field: {
        create:
          einsatz_fields?.map((field) => ({
            field: { connect: { id: field.field_id } },

            value: field.value,
          })) || [],
      },
      einsatz_helper: {
        create: assignedUsers.map((userId) => ({
          user: { connect: { id: userId } },
        })),
      },
      einsatz_user_property: {
        create:
          userProperties?.map((propId) => ({
            user_property: { connect: { id: propId.user_property_id } },
            is_required: propId.is_required,
            min_matching_users: propId.min_matching_users ?? null,
          })) || [],
      },
      status_id,
      template_id,
    },
  });
}
function isValidUuid(id?: unknown): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/.test(
    id
  );
}

async function getAllEinsaetzeFromDb(
  org_ids: string[],
  userId: string
): Promise<Einsatz[]> {
  if (!org_ids || org_ids.length === 0) {
    return [];
  }
  return await prisma.einsatz.findMany({
    where: {
      org_id: {
        in: org_ids,
      },
      organization: {
        user_organization_role: {
          some: {
            user_id: userId,
          },
        },
      },
    },
    orderBy: { start: 'asc', title: 'asc' },
  });
}

async function getEinsatzForCalendarFromDb(
  id: string
): Promise<EinsatzForCalendar | Response | null> {
  if (!isValidUuid(id)) {
    return new Response('Invalid ID', { status: 400 });
  }

  return prisma.einsatz.findUnique({
    select: {
      id: true,
      title: true,
      start: true,
      end: true,
      all_day: true,
      einsatz_status: {
        select: {
          id: true,
          verwalter_color: true,
          verwalter_text: true,
          helper_color: true,
          helper_text: true,
        },
      },
      einsatz_to_category: {
        select: {
          einsatz_category: {
            select: {
              value: true,
              abbreviation: true,
            },
          },
        },
      },
      einsatz_helper: {
        select: {
          user_id: true,
        },
      },
      helpers_needed: true,
      _count: {
        select: {
          einsatz_helper: true,
        },
      },
    },
    where: {
      id,
    },
  });
}

async function getAllEinsatzeForCalendarFromDb(
  org_ids: string[]
): Promise<EinsatzForCalendar[]> {
  if (!org_ids || org_ids.length === 0) {
    return [];
  }
  return prisma.einsatz.findMany({
    select: {
      id: true,
      title: true,
      start: true,
      end: true,
      all_day: true,
      einsatz_status: {
        select: {
          id: true,
          verwalter_color: true,
          verwalter_text: true,
          helper_color: true,
          helper_text: true,
        },
      },
      einsatz_to_category: {
        select: {
          einsatz_category: {
            select: {
              value: true,
              abbreviation: true,
            },
          },
        },
      },
      einsatz_helper: {
        select: {
          user_id: true,
        },
      },
      helpers_needed: true,
      _count: {
        select: {
          einsatz_helper: true,
        },
      },
    },
    where: {
      org_id: {
        in: org_ids,
      },
    },
    orderBy: [{ start: 'asc' }, { title: 'asc' }],
  });
}

type RawEinsatzWithDetails = Awaited<
  ReturnType<typeof getEinsatzWithDetailsByIdFromDb>
>;

function mapRawEinsatzToDetailedForCalendar(
  row: NonNullable<RawEinsatzWithDetails>
): EinsatzDetailedForCalendar {
  const {
    einsatz_status,
    einsatz_helper,
    einsatz_to_category,
    change_log,
    einsatz_field,
    einsatz_user_property,
    ...rest
  } = row;
  const category_abbreviations = einsatz_to_category.map(
    (c) => c.einsatz_category.abbreviation ?? ''
  );
  return {
    ...rest,
    einsatz_status,
    assigned_users: Array.from(
      new Set(einsatz_helper.map((helper) => helper.user_id))
    ),
    einsatz_fields: einsatz_field.map((field) => ({
      id: field.id,
      field_name: field.field.name,
      einsatz_id: field.einsatz_id,
      field_id: field.field_id,
      value: field.value,
      group_name: field.field.group_name,
      field_type: { datatype: field.field.type?.datatype ?? null },
    })),
    categories: einsatz_to_category.map((cat) => cat.einsatz_category.id),
    user_properties: einsatz_user_property.map((prop) => ({
      user_property_id: prop.user_property_id,
      is_required: prop.is_required,
      min_matching_users: prop.min_matching_users,
    })),
    change_log: change_log.map((log) => ({
      id: log.id,
      einsatz_id: log.einsatz_id,
      user_id: log.user_id,
      type_id: log.type_id,
      created_at: log.created_at,
      affected_user: log.affected_user,
      user: log.user
        ? {
          id: log.user.id,
          firstname: log.user.firstname,
          lastname: log.user.lastname,
        }
        : null,
    })),
    category_abbreviations,
  };
}

async function getDetailedEinsaetzeForCalendarRangeFromDb(
  org_ids: string[],
  rangeStart: Date,
  rangeEnd: Date
) {
  if (!org_ids.length) return [];
  return prisma.einsatz.findMany({
    where: {
      org_id: { in: org_ids },
      start: { lt: rangeEnd },
      end: { gt: rangeStart },
    },
    include: {
      einsatz_helper: {
        select: {
          id: true,
          einsatz_id: true,
          user_id: true,
          joined_at: true,
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      einsatz_to_category: {
        include: {
          einsatz_category: true,
        },
      },
      einsatz_status: true,
      einsatz_user_property: {
        select: {
          user_property_id: true,
          is_required: true,
          min_matching_users: true,
        },
      },
      change_log: {
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          einsatz_id: true,
          created_at: true,
          user_id: true,
          type_id: true,
          affected_user: true,
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          change_type: true,
        },
      },
      einsatz_field: {
        select: {
          id: true,
          einsatz_id: true,
          field_id: true,
          value: true,
          field: {
            select: {
              id: true,
              name: true,
              type_id: true,
              is_required: true,
              placeholder: true,
              default_value: true,
              group_name: true,
              is_multiline: true,
              min: true,
              max: true,
              type: {
                select: {
                  name: true,
                  datatype: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ start: 'asc' }, { title: 'asc' }],
  });
}

async function getEinsatzWithDetailsByIdFromDb(einsatzId: string) {
  const { session } = await requireAuth();

  return prisma.einsatz.findUnique({
    where: {
      id: einsatzId,
      organization: {
        user_organization_role: { some: { user_id: session.user.id } },
      },
    },
    include: {
      einsatz_helper: {
        select: {
          id: true,
          einsatz_id: true,
          user_id: true,
          joined_at: true,
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      einsatz_to_category: {
        include: {
          einsatz_category: true,
        },
      },
      einsatz_status: true,
      einsatz_user_property: {
        select: {
          user_property_id: true,
          is_required: true,
          min_matching_users: true,
        },
      },
      change_log: {
        select: {
          id: true,
          einsatz_id: true,
          created_at: true,
          user_id: true,
          type_id: true,
          affected_user: true,
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          change_type: true,
        },
      },
      einsatz_field: {
        select: {
          id: true,
          einsatz_id: true,
          field_id: true,
          value: true,
          field: {
            select: {
              id: true,
              name: true,
              type_id: true,
              is_required: true,
              placeholder: true,
              default_value: true,
              group_name: true,
              is_multiline: true,
              min: true,
              max: true,
              type: {
                select: {
                  name: true,
                  datatype: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
