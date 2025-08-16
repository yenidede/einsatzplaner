"use server";

import prisma from "@/lib/prisma";
import { unstable_cache as cache } from "next/cache";
import type { einsatz as Einsatz, Prisma } from "@/generated/prisma";
import type { EinsatzForCalendar, EinsatzCreate, EinsatzDetailed, EinsatzCustomizable, ETV } from "@/features/einsatz/types";
import { extendedColumnFiltersToWhere } from "@/components/data-table-server/lib/parsers";
import { ValidateEinsatzCreate } from "./validation-service";
import { applyFilterOptions, filterByOption } from "./utils"
import z from "zod";

// TODO: Add auth check
export async function getEinsatzWithDetailsById(id: string): Promise<EinsatzDetailed | null> {
  const einsaetzeFromDb = await getEinsatzWithDetailsByIdFromDb(id);

  if (!einsaetzeFromDb) return null;

  // Destructure to avoid leaking raw relation arrays in the DTO
  const {
    einsatz_status,
    einsatz_helper,
    einsatz_to_category,
    einsatz_comment,
    change_log,
    einsatz_field,
    ...rest
  } = einsaetzeFromDb;

  return {
    ...rest,
    einsatz_status,
    assigned_users: einsatz_helper.map((helper) => helper.user_id),
    einsatz_fields: einsatz_field.map((field) => ({
      id: field.id,
      einsatz_id: field.einsatz_id,
      field_id: field.field_id,
      value: field.value,
    })),
    categories: einsatz_to_category.map((cat) => cat.einsatz_category.id),
    comments: einsatz_comment.map((comment) => ({
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
  return getAllEinsaetzeFromDb(org_ids);
}

export async function getAllEinsaetzeForCalendar(org_ids: string[]) {
  return getAllEinsatzeForCalendarFromDb(org_ids);
}

export async function getEinsatzForCalendar(id: string) {
  return getEinsatzForCalendarFromDb(id);
}

export async function getEinsaetzeForTableView(org_ids: string[]): Promise<ETV[]> {
  const einsaetzeFromDb = await prisma.einsatz.findMany({
    where: {
      org_id: { in: org_ids }
    },
    include: {
      einsatz_status: true,
      organization: { select: { name: true } },
      einsatz_helper: {
        select: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            }
          }
        }
      },
      einsatz_to_category: {
        include: {
          einsatz_category: true
        }
      },
      einsatz_field: {
        include: {
          field: {
            include: {
              type: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
        }
      },
      einsatz_template: {
        select: {
          id: true,
          name: true,
        }
      },
      _count: {
        select: {
          einsatz_helper: true,
        }
      }
    },
    orderBy: { created_at: "asc" },
  });

  return einsaetzeFromDb;
}

export async function getEinsaetzeFiltered(
  filters: import("@/components/data-table-server/types/data-table").ExtendedColumnFilter<EinsatzCustomizable>[],
  sort: { sort_field: keyof Einsatz; sort_order: "asc" | "desc" },
  pagination: { limit: number; offset: number },
  org_ids: string[] = ["0c39989e-07bc-4074-92bc-aa274e5f22d0"]
): Promise<{ data: EinsatzCustomizable[]; showing: number; total: number }> {
  // Build the where clause from ExtendedColumnFilter[]
  const where: Partial<Prisma.einsatzWhereInput> = extendedColumnFiltersToWhere(filters);

  // Always include relations needed for computed fields and transformation
  const include = {
    einsatz_status: true,
    organization: { select: { name: true } },
    einsatz_helper: {
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          }
        }
      }
    },
    einsatz_to_category: {
      include: {
        einsatz_category: true
      }
    },
    einsatz_field: {
      include: {
        field: {
          include: {
            type: {
              select: {
                name: true,
              }
            }
          }
        }
      }
    },
    user: {
      select: {
        id: true,
        firstname: true,
        lastname: true,
      }
    },
    einsatz_template: {
      select: {
        name: true,
      }
    },
    _count: {
      select: {
        einsatz_helper: true,
      }
    }
  };

  const [einsaetzeFromDb, total] = await Promise.all([
    prisma.einsatz.findMany({
      where,
      include,
      orderBy: { [sort.sort_field]: sort.sort_order },
      take: pagination.limit,
      skip: pagination.offset,
    }),
    prisma.einsatz.count({ where: { org_id: { in: org_ids } } })
  ]);

  // Transform the data to match EinsatzCustomizable type
  const transformedData: EinsatzCustomizable[] = einsaetzeFromDb.map((einsatz) => {
    const assigned_helpers_count = einsatz._count.einsatz_helper;
    const still_needed_helpers = Math.max(0, einsatz.helpers_needed - assigned_helpers_count);

    const assigned_users_name = einsatz.einsatz_helper.map((helper: any) =>
      `${helper.user.firstname || ''} ${helper.user.lastname || ''}`.trim()
    );

    const created_by_name = einsatz.user
      ? `${einsatz.user.firstname || ''} ${einsatz.user.lastname || ''}`.trim()
      : '';

    const template_name = einsatz.einsatz_template?.name || '';

    return {
      id: einsatz.id,
      title: einsatz.title,
      template_name,

      created_at: einsatz.created_at,
      updated_at: einsatz.updated_at,

      start: einsatz.start,
      end: einsatz.end,
      all_day: einsatz.all_day,

      helpers_needed: einsatz.helpers_needed,
      still_needed_helpers,
      assigned_helpers_count,
      assigned_users_name,
      created_by_name,

      participant_count: einsatz.participant_count,
      price_per_person: einsatz.price_per_person,
      total_price: einsatz.total_price,

      einsatz_status: einsatz.einsatz_status,
      organization_name: einsatz.organization.name,

      categories: einsatz.einsatz_to_category.map((cat: any) => cat.einsatz_category),
      einsatz_fields: einsatz.einsatz_field.map((field: any) => ({
        id: field.id,
        einsatz_id: field.einsatz_id,
        field_id: field.field_id,
        value: field.value,
      })),
    } as EinsatzCustomizable;
  });

  // TODO: filter after computed fields

  const showing = transformedData.length;
  return { data: transformedData, showing, total };
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

export async function updateEinsatzTime(data: { id: string; start: Date; end: Date }): Promise<Einsatz> {
  const dataSchema = z.object({
    id: z.string(),
    start: z.date(),
    end: z.date(),
  });

  const { id, start, end } = dataSchema.parse(data);

  return prisma.einsatz.update({
    where: { id },
    data: {
      start,
      end,
      updated_at: new Date(),
    },
  });
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
            deleteMany: {},
            create: (assignedUsers ?? []).map((userId) => ({
              user: { connect: { id: userId } },
            })),
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

export async function deleteEinsaetzeByIds(einsatzIds: string[]): Promise<void> {
  // TODO: check if logged in user has permission to delete this Einsatz

  const einsatz = await prisma.einsatz.findMany({
    where: { id: { in: einsatzIds } },
  });
  if (!einsatz || einsatz.length === 0) {
    throw new Error(`No Einsaetze found: ${einsatzIds.join(", ")}`);
  }

  try {
    await prisma.einsatz.deleteMany({
      where: {
        id: { in: einsatzIds },
      },
    });
  } catch (error) {
    throw new Error(`Failed to delete Einsaetze with IDs ${einsatzIds.join(", ")}: ${error}`);
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

async function getEinsatzForCalendarFromDb(
  id: string
): Promise<EinsatzForCalendar | null> {
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
