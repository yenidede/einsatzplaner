"use server";

import prisma from "@/lib/prisma";
import type { einsatz as Einsatz } from "@/generated/prisma";
import type { EinsatzForCalendar, EinsatzCreate, EinsatzDetailed } from "@/features/einsatz/types";
import { ValidateEinsatzCreate } from "./validation-service";

// TODO: Add auth check
export async function getEinsatzWithDetailsById(id: string): Promise<EinsatzDetailed | null> {
  const einsaetzeFromDb = await getEinsatzWithDetailsByIdFromDb(id);

  if (!einsaetzeFromDb) return null;

  return {
    ...einsaetzeFromDb,
    einsatz_status: einsaetzeFromDb.einsatz_status,
    assigned_users: einsaetzeFromDb.einsatz_helper.map(helper => helper.user_id),
    einsatz_fields: einsaetzeFromDb.einsatz_field.map(field => ({
      id: field.id,
      einsatz_id: field.einsatz_id,
      field_id: field.field_id,
      value: field.value,
    })),
    categories: einsaetzeFromDb.einsatz_to_category.map(cat => cat.einsatz_category.id),
    comments: einsaetzeFromDb.einsatz_comment.map(comment => ({
      id: comment.id,
      einsatz_id: comment.einsatz_id,
      user_id: comment.user_id,
      created_at: comment.created_at,
      comment: comment.comment,
      user: {
        id: comment.user.id,
        firstname: comment.user.firstname,
        lastname: comment.user.lastname,
      },
    })),
    change_log: einsaetzeFromDb.change_log.map(log => ({
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
  return getAllEinsaetzeFromDb(org_ids);
}

export async function getAllEinsaetzeForCalendar(org_ids: string[]) {
  return getAllEinsatzeForCalendarFromDb(org_ids);
}

export async function getAllTemplatesWithFields(org_id: string) {
  return prisma.einsatz_template.findMany({
    where: {
      org_id,
    },
    include: {
      template_icon: {
        select: {
          icon_url: true,
        }
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
        }
      }
    },
  })
}

export async function createEinsatz({ data }: { data: EinsatzCreate }): Promise<Einsatz> {
  return createEinsatzInDb({ data })
}

export async function updateEinsatz({ data }: { data: Partial<EinsatzCreate> }): Promise<Einsatz> {
  if (data.template_id && false) {
    const parsedDynamicFields = await ValidateEinsatzCreate(data.template_id);
  }

  const { id, categories, einsatz_fields, assignedUsers, org_id, ...updateData } = data;

  if (!id) {
    throw new Error("Einsatz must have an id for update");
  }

  console.log("Updating Einsatz with data:", updateData);
  console.log("Dynamic fields:", einsatz_fields);

  try {
    return prisma.einsatz.update({
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
          })
        },
        einsatz_helper: {
          ...(assignedUsers && {
            set: assignedUsers.map((userId) => ({ id: userId })),
          }),
        },
      },
    });
  } catch (error) {
    throw new Error(`Failed to update Einsatz with ID ${id}: ${error}`);
  }
}

export async function deleteEinsatzById(einsatzId: string): Promise<void> {
  // TODO: check if logged in user has permission to delete this Einsatz

  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
  });
  if (!einsatz) {
    throw new Error(`Einsatz with ID ${einsatzId} not found`);
  }

  try {
    await prisma.einsatz.delete({
      where: {
        id: einsatz.id,
      },
    });
  } catch (error) {
    throw new Error(`Failed to delete Einsatz with ID ${einsatzId}: ${error}`);
  }
}

async function createEinsatzInDb({ data }: { data: EinsatzCreate }): Promise<Einsatz> {
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
    status_id = "offen",
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
        create: categories.map((category) => ({
          einsatz_category: { connect: { id: category } },
        })),
      },
      einsatz_field: {
        create: einsatz_fields.map((field) => ({
          field: { connect: { id: field.field_id } },
          value: field.value,
        })),
      },
      einsatz_helper: {
        connect: assignedUsers.map((userId) => ({ id: userId })),
      },
      status_id,
      template_id,
    },
  });
}

async function getEinsatzByIdFromDb(
  id: string,
  org_id: string
): Promise<Einsatz | null> {
  return prisma.einsatz.findUnique({
    where: { id, org_id },
    include: {
      user: true,
    },
  });
}

async function getAllEinsaetzeFromDb(org_ids: string[]): Promise<Einsatz[]> {
  if (!org_ids || org_ids.length === 0) {
    return [];
  }
  return prisma.einsatz.findMany({
    where: {
      org_id: {
        in: org_ids,
      },
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

async function getEinsatzWithDetailsByIdFromDb(
  einsatzId: string
) {
  return prisma.einsatz.findUnique({
    where: { id: einsatzId },
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
      einsatz_comment: {
        select: {
          id: true,
          einsatz_id: true,
          user_id: true,
          created_at: true,
          comment: true,
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
                },
              },
            },
          },
        },
      },
    },
  });
}
