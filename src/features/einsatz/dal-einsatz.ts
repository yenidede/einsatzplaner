"use server";

import prisma from "@/lib/prisma";
import { unstable_cache as cache } from "next/cache";
import type { einsatz as Einsatz, Prisma } from "@/generated/prisma";
import type { EinsatzForCalendar, EinsatzCreate, EinsatzDetailed, EinsatzCustomizable, EinsatzCustomizableFilter } from "@/features/einsatz/types";
import { ValidateEinsatzCreate } from "./validation-service";
import { applyFilterOptions, filterByOption } from "./utils"

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

export async function getEinsaetzeFiltered(
  //select: Partial<EinsatzCustomizable>,
  filters: Partial<EinsatzCustomizableFilter>,
  { limit, offset }: { limit: number; offset: number }
): Promise<{ data: EinsatzCustomizable[]; total: number }> {
  // Build the where clause from filters
  const where: Partial<Prisma.einsatzWhereInput> = {};

  if (filters.id) where.id = filters.id;
  if (filters.title) where.title = { contains: filters.title, mode: 'insensitive' };

  if (filters.start) {
    where.start = applyFilterOptions(filters.start.date, filters.start.options) as any;
  }
  if (filters.end) {
    where.end = applyFilterOptions(filters.end.date, filters.end.options) as any;
  }

  if (filters.all_day !== undefined) where.all_day = filters.all_day;

  if (filters.helpers_needed) {
    where.helpers_needed = applyFilterOptions(filters.helpers_needed.value, filters.helpers_needed.options) as any;
  }
  if (filters.participant_count && filters.participant_count.value !== null) {
    where.participant_count = applyFilterOptions(filters.participant_count.value, filters.participant_count.options);
  }
  if (filters.price_per_person && filters.price_per_person.value !== null) {
    where.price_per_person = applyFilterOptions(filters.price_per_person.value, filters.price_per_person.options);
  }
  if (filters.total_price && filters.total_price.value !== null) {
    where.total_price = applyFilterOptions(filters.total_price.value, filters.total_price.options);
  }
  if (filters.created_at) {
    where.created_at = applyFilterOptions(filters.created_at.date, filters.created_at.options);
  }
  if (filters.updated_at && filters.updated_at.date !== null) {
    where.updated_at = applyFilterOptions(filters.updated_at.date, filters.updated_at.options);
  }

  // Status filter
  if (filters.status?.id) {
    where.status_id = filters.status.id;
  }

  // Organization filter
  if (filters.organization_name) {
    where.organization = {
      name: { contains: filters.organization_name, mode: 'insensitive' }
    };
  }

  // Categories filter (array of category IDs)
  if (filters.categories && filters.categories.length > 0) {
    const categoryIds = filters.categories.map(cat => cat.id);
    where.einsatz_to_category = {
      some: {
        einsatz_category: {
          id: { in: categoryIds }
        }
      }
    };
  }

  // Template filter
  if (filters.template_name) {
    where.einsatz_template = {
      name: { contains: filters.template_name, mode: 'insensitive' }
    };
  }

  // Computed field filters (need to be handled at application level)
  // These will be filtered after the query
  const computedFilters = {
    still_needed_helpers: filters.still_needed_helpers,
    assigned_helpers_count: filters.assigned_helpers_count,
    assigned_users_name: filters.assigned_users_name,
    created_by_name: filters.created_by_name,
  };

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

  // Get the data with a larger limit if we need to filter computed fields
  const hasComputedFilters = Object.values(computedFilters).some(v => v !== undefined);
  const queryLimit = hasComputedFilters ? limit * 2 : limit; // Fetch more if we need to filter

  const einsaetzeFromDb = await prisma.einsatz.findMany({
    where,
    include,
    orderBy: { created_at: 'desc' },
    take: queryLimit,
    skip: offset,
  });

  // Transform the data to match EinsatzCustomizable type
  let transformedData: EinsatzCustomizable[] = einsaetzeFromDb.map((einsatz) => {
    const assigned_helpers_count = einsatz._count.einsatz_helper;
    const still_needed_helpers = Math.max(0, einsatz.helpers_needed - assigned_helpers_count);

    const assigned_users_name = einsatz.einsatz_helper.map(helper =>
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

      categories: einsatz.einsatz_to_category.map(cat => cat.einsatz_category),
      einsatz_fields: einsatz.einsatz_field.map(field => ({
        id: field.id,
        einsatz_id: field.einsatz_id,
        field_id: field.field_id,
        value: field.value,
      })),
    } as EinsatzCustomizable;
  });

  // Apply computed field filters
  if (hasComputedFilters) {
    if (computedFilters.still_needed_helpers !== undefined) {
      transformedData = transformedData.filter(e => filterByOption(e.still_needed_helpers, computedFilters.still_needed_helpers?.value, computedFilters.still_needed_helpers?.options));
    }
    if (computedFilters.assigned_helpers_count !== undefined) {
      transformedData = transformedData.filter(e => filterByOption(e.assigned_helpers_count, computedFilters.assigned_helpers_count?.value, computedFilters.assigned_helpers_count?.options));
    }
    if (computedFilters.created_by_name) {
      transformedData = transformedData.filter(e => (e.created_by_name ?? "").toLowerCase().includes(computedFilters.created_by_name?.value.toLowerCase() || "ajksdjfakjsdjgaöksdjfaksdfaskdgöajskdöajfk"));
    }
    if (computedFilters.assigned_users_name && computedFilters.assigned_users_name.value.length > 0) {
      transformedData = transformedData.filter(e =>
        (e.assigned_users_name ?? []).some(name =>
          computedFilters.assigned_users_name!.value.some(filterName =>
            name.toLowerCase().includes(filterName.toLowerCase())
          )
        )
      );
    }

    // Limit results after filtering
    transformedData = transformedData.slice(0, limit);
  }

  const total = transformedData.length;
  return { data: transformedData, total };
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

export async function updateEinsatzTime({ id, start, end }: { id: string; start: Date; end: Date }): Promise<Einsatz> {
  if (!id) {
    throw new Error("Einsatz must have an id for update");
  }

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
