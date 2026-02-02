'use server';

import prisma from '@/lib/prisma';
import type { einsatz as Einsatz, einsatz_field } from '@/generated/prisma';
import type {
  EinsatzForCalendar,
  EinsatzCreate,
  EinsatzDetailed,
  ETV,
} from '@/features/einsatz/types';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';

import { ValidateEinsatzCreate } from './validation-service';
import z from 'zod';
import { detectChangeTypes, getAffectedUserIds } from '../activity_log/utils';
import { createChangeLogAuto } from '../activity_log/activity_log-dal';
import { BadRequestError, ForbiddenError } from '@/lib/errors';
import { sseEmitter } from '@/lib/sse/eventEmitter';

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

  // Find all Einsatz assignments for these users that overlap with the given time range
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

// TODO: Add auth check
export async function getEinsatzWithDetailsById(
  id: string
): Promise<EinsatzDetailed | null | Response> {
  const { session } = await requireAuth();
  if (!isValidUuid(id)) {
    throw new BadRequestError('Invalid ID');
  }

  const einsaetzeFromDb = await getEinsatzWithDetailsByIdFromDb(id);

  if (!einsaetzeFromDb) return null;

  // Prüfe ob User Zugriff auf diese Organisation hat
  if (!session.user.orgIds.includes(einsaetzeFromDb.org_id)) {
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
      user: {
        id: log.user.id,
        firstname: log.user.firstname,
        lastname: log.user.lastname,
      },
    })),
  };
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
  return getEinsatzForCalendarFromDb(id);
}

export async function getEinsaetzeForTableView(
  active_org_ids: string[]
): Promise<ETV[]> {
  const { session } = await requireAuth();

  const userOrgIds = session.user.orgIds;
  const filterOrgIds = active_org_ids ? active_org_ids : userOrgIds;

  const einsaetzeFromDb = await prisma.einsatz.findMany({
    where: {
      org_id: {
        in: filterOrgIds,
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
              type: {
                select: {
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

  // Map DB result to ETV type
  const mapped: ETV[] = einsaetzeFromDb.map((einsatz) => ({
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
    einsatz_status: einsatz.einsatz_status,
    anmerkung: einsatz.anmerkung,
    organization: {
      id: einsatz.organization.id,
      name: einsatz.organization.name,
    },
    einsatz_helper: Array.from(
      new Map(
        einsatz.einsatz_helper.map((helper) => [
          helper.user.id,
          {
            id: helper.user.id,
            firstname: helper.user.firstname ?? null,
            lastname: helper.user.lastname ?? null,
          },
        ])
      ).values()
    ),
    einsatz_categories: einsatz.einsatz_to_category.map(
      (cat) => cat.einsatz_category
    ),
    einsatz_fields: einsatz.einsatz_field.map(
      (f) =>
        ({
          id: f.id,
          einsatz_id: f.einsatz_id,
          value: f.value,
          field_id: f.field_id,
          datatype: f.field.type?.datatype ?? null,
        }) as einsatz_field & { datatype: string | null }
    ),
    user: einsatz.user
      ? {
          id: einsatz.user.id,
          firstname: einsatz.user.firstname ?? null,
          lastname: einsatz.user.lastname ?? null,
        }
      : null,
    einsatz_template: einsatz.einsatz_template
      ? {
          id: einsatz.einsatz_template.id,
          name: einsatz.einsatz_template.name ?? null,
        }
      : null,
    _count: einsatz._count,
  }));

  return mapped;
}

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

  if (
    !(await hasPermission(
      session,
      'einsaetze:create',
      session.user.activeOrganization?.id
    ))
  ) {
    throw new ForbiddenError('Fehlende Berechtigungen');
  }

  const userOrgIds = userIds?.orgIds || (userIds?.orgId ? [userIds.orgId] : []);
  const useOrgId =
    data.org_id || (userOrgIds.length === 1 ? userOrgIds[0] : undefined);

  if (!useOrgId) {
    throw new BadRequestError('Organisation muss angegeben werden');
  }

  if (!userOrgIds.includes(useOrgId)) {
    throw new ForbiddenError('Fehlende Berechtigungen für diese Organisation');
  }

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

  const einsatzWithAuth = {
    ...data,
    created_by: userIds.userId,
    org_id: useOrgId,
  };

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

      for (const typeName of changeTypeNames) {
        const affectedUserId =
          typeName === 'create' ? null : affectedUserIds[0] || null;

        await createChangeLogAuto({
          einsatzId: createdEinsatz.id,
          userId: userIds.userId,
          typeName: typeName,
          affectedUserId: affectedUserId,
        });
      }
    } catch (error) {
      console.error('Failed to create activity logs:', error);
    }
  }

  sseEmitter.emit({
    type: 'einsatz:created',
    data: createdEinsatz,
    orgId: useOrgId,
  });
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
  if (
    !(await hasPermission(
      session,
      'einsaetze:update',
      session.user.activeOrganization?.id
    ))
  ) {
    throw new ForbiddenError('Fehlende Berechtigungen');
  }

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
      einsatz_helper: {
        select: { user_id: true },
      },
    },
  });

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

  sseEmitter.emit({
    type: 'einsatz:updated',
    data: einsatz,
    orgId: einsatz.org_id,
  });

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
    throw new Response(`Einsatz with ID ${einsatzId} not found`, {
      status: 404,
    });
  }

  const isSignedInUserAssigned = existingEinsatz.einsatz_helper.some(
    (helper) => helper.user_id === session.user.id
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
        typeName: 'cancel',
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
        typeName: 'takeover',
        affectedUserId: session.user.id, // as the user is assigning themselves they are also the affected user
      });
    } catch (error) {
      console.error('Failed to create activity log for assignment:', error);
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
  const { session, userIds } = await requireAuth();

  if (
    !(await hasPermission(
      session,
      'einsaetze:update',
      session.user.activeOrganization?.id
    ))
  ) {
    throw new ForbiddenError('Fehlende Berechtigungen');
  }

  if (data.template_id && false) {
    // TODO implement server side validation
    const parsedDynamicFields = await ValidateEinsatzCreate(
      data as EinsatzCreate
    );
  }
  const {
    id,
    categories,
    einsatz_fields,
    assignedUsers,
    org_id,
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
    },
  });

  if (!existingEinsatz) {
    throw new Response(`Einsatz with ID ${id} not found`, { status: 404 });
  }

  const userOrgIds = userIds?.orgIds || (userIds?.orgId ? [userIds.orgId] : []);
  if (!userOrgIds.includes(existingEinsatz.org_id)) {
    throw new ForbiddenError('Fehlende Berechtigungen für diese Organisation');
  }

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
    throw new Response(`Failed to update Einsatz with ID ${id}: ${error}`, {
      status: 500,
    });
  }
}

export async function deleteEinsatzById(einsatzId: string): Promise<void> {
  const { session } = await requireAuth();

  if (
    !(await hasPermission(
      session,
      'einsaetze:delete',
      session.user.activeOrganization?.id
    ))
  ) {
    throw new Response('Unauthorized', { status: 403 });
  }

  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    select: { id: true, org_id: true },
  });

  if (!einsatz) {
    throw new Response(`Einsatz with ID ${einsatzId} not found`, {
      status: 404,
    });
  }

  try {
    await prisma.einsatz.delete({
      where: {
        id: einsatz.id,
      },
    });
    sseEmitter.emit({
      type: 'einsatz:deleted',
      data: { id: einsatz.id, deleted: true },
      orgId: einsatz.org_id,
    });
  } catch (error) {
    throw new Response(
      `Failed to delete Einsatz with ID ${einsatzId}: ${error}`,
      { status: 500 }
    );
  }
}

export async function deleteEinsaetzeByIds(
  einsatzIds: string[]
): Promise<void> {
  // TODO: check if logged in user has permission to delete this Einsatz

  const einsatz = await prisma.einsatz.findMany({
    where: { id: { in: einsatzIds } },
  });
  if (!einsatz || einsatz.length === 0) {
    throw new BadRequestError(`No Einsaetze found: ${einsatzIds.join(', ')}`);
  }

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

async function getEinsatzByIdFromDb(
  id: string,
  org_id: string
): Promise<Einsatz | null> {
  /*   if (!isValidUuid(id)) {
      console.error("ungültige IDs", { id});
      return null;
    }
    if (!isValidUuid(org_id)) {
      console.error("ungültige IDs", {org_id });
      return null;
    } */

  return prisma.einsatz.findUnique({
    where: { id, org_id },
    include: {
      organization: true,
      einsatz_to_category: { include: { einsatz_category: true } },
      einsatz_helper: { include: { user: true } },
      einsatz_status: true,
      user: true,
    },
  });
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
