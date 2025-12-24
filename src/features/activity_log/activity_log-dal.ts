"use server";

import prisma from "@/lib/prisma";
import type {
  ChangeLogEntry,
  CreateChangeLogInput,
  ActivityLogFilters,
  ActivityLogResult,
} from "./types";
import { Prisma } from "@/generated/prisma";

export async function createChangeLogAuto({
  einsatzId,
  userId,
  typeName,
  affectedUserId,
}: {
  einsatzId: string;
  userId: string;
  typeName: string;
  affectedUserId?: string | null;
}): Promise<ChangeLogEntry | null> {
  try {
    const changeType = await prisma.change_type.findFirst({
      where: { name: typeName },
    });

    if (!changeType) {
      console.warn(`Change type "${typeName}" not found in database`);
      return null;
    }

    return await createChangeLog({
      einsatzId,
      userId,
      typeId: changeType.id,
      affectedUserId,
    });
  } catch (error) {
    console.error("Failed to create change log:", error);
    return null;
  }
}

export async function createChangeLog(
  input: CreateChangeLogInput
): Promise<ChangeLogEntry> {
  const changeLog = await prisma.change_log.create({
    data: {
      einsatz_id: input.einsatzId,
      user_id: input.userId,
      type_id: input.typeId,
      affected_user: input.affectedUserId,
    },
    include: {
      change_type: true,
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      user_change_log_affected_userTouser: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      einsatz: {
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
          all_day: true,
          einsatz_to_category: {
            include: {
              einsatz_category: {
                select: {
                  id: true,
                  value: true,
                  abbreviation: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    id: changeLog.id,
    einsatz_id: changeLog.einsatz_id,
    user_id: changeLog.user_id,
    type_id: changeLog.type_id,
    created_at: changeLog.created_at,
    affected_user: changeLog.affected_user,
    change_type: changeLog.change_type,
    user: changeLog.user,
    affected_user_data: changeLog.user_change_log_affected_userTouser,
    einsatz: {
      id: changeLog.einsatz.id,
      title: changeLog.einsatz.title,
      start: changeLog.einsatz.start,
      end: changeLog.einsatz.end,
      all_day: changeLog.einsatz.all_day,
      einsatz_to_category: changeLog.einsatz.einsatz_to_category.map((etc) => ({
        id: etc.id,
        category_id: etc.category_id,
        einsatz_category: {
          id: etc.einsatz_category.id,
          value: etc.einsatz_category.value,
          abbreviation: etc.einsatz_category.abbreviation,
        },
      })),
    },
  };
}

export async function getActivities(
  orgId: string,
  limit = 100,
  offset = 0
): Promise<ChangeLogEntry[]> {
  const logs = await prisma.change_log.findMany({
    where: {
      einsatz: {
        org_id: orgId,
      },
    },
    include: {
      change_type: true,
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      user_change_log_affected_userTouser: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
        },
      },
      einsatz: {
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
          all_day: true,
          einsatz_to_category: {
            include: {
              einsatz_category: {
                select: {
                  id: true,
                  value: true,
                  abbreviation: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    skip: offset,
  });

  return logs.map((log) => ({
    id: log.id,
    einsatz_id: log.einsatz_id,
    user_id: log.user_id,
    type_id: log.type_id,
    created_at: log.created_at,
    affected_user: log.affected_user,
    change_type: log.change_type,
    user: log.user,
    affected_user_data: log.user_change_log_affected_userTouser,
    einsatz: {
      id: log.einsatz.id,
      title: log.einsatz.title,
      start: log.einsatz.start,
      end: log.einsatz.end,
      all_day: log.einsatz.all_day,
      einsatz_to_category: log.einsatz.einsatz_to_category.map((etc) => ({
        id: etc.id,
        category_id: etc.category_id,
        einsatz_category: {
          id: etc.einsatz_category.id,
          value: etc.einsatz_category.value,
          abbreviation: etc.einsatz_category.abbreviation,
        },
      })),
    },
  }));
}

export async function getActivityLogs(
  filters: ActivityLogFilters = {}
): Promise<ActivityLogResult> {
  const {
    einsatzId,
    userId,
    typeId,
    orgId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const where: Prisma.change_logWhereInput = {
    AND: [],
  };
  if (einsatzId) {
    where.einsatz_id = einsatzId;
  }

  if (userId) {
    where.OR = [{ user_id: userId }, { affected_user: userId }];
  }

  if (typeId) {
    where.type_id = typeId;
  }

  if (orgId) {
    where.einsatz = {
      org_id: orgId,
    };
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) {
      where.created_at.gte = startDate;
    }
    if (endDate) {
      where.created_at.lte = endDate;
    }
  }

  const [activities, total] = await Promise.all([
    prisma.change_log.findMany({
      where,
      include: {
        change_type: true,
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        user_change_log_affected_userTouser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        einsatz: {
          select: {
            id: true,
            title: true,
            start: true,
            end: true,
            all_day: true,
            einsatz_to_category: {
              include: {
                einsatz_category: {
                  select: {
                    id: true,
                    value: true,
                    abbreviation: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.change_log.count({ where }),
  ]);

  return {
    activities: activities.map((activity) => ({
      id: activity.id,
      einsatz_id: activity.einsatz_id,
      user_id: activity.user_id,
      type_id: activity.type_id,
      created_at: activity.created_at,
      affected_user: activity.affected_user,
      change_type: activity.change_type,
      user: activity.user,
      affected_user_data: activity.user_change_log_affected_userTouser,
      einsatz: {
        id: activity.einsatz.id,
        title: activity.einsatz.title,
        start: activity.einsatz.start,
        end: activity.einsatz.end,
        all_day: activity.einsatz.all_day,
        einsatz_to_category: activity.einsatz.einsatz_to_category.map(
          (etc) => ({
            id: etc.id,
            category_id: etc.category_id,
            einsatz_category: {
              id: etc.einsatz_category.id,
              value: etc.einsatz_category.value,
              abbreviation: etc.einsatz_category.abbreviation,
            },
          })
        ),
      },
    })),
    total,
    hasMore: offset + limit < total,
  };
}

export async function getChangeTypes() {
  return await prisma.change_type.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getChangeTypeById(typeId: string) {
  return await prisma.change_type.findUnique({
    where: { id: typeId },
  });
}

export async function getEinsatzActivityLogs(
  einsatzId: string,
  limit = 50,
  offset = 0
): Promise<ActivityLogResult> {
  return getActivityLogs({ einsatzId, limit, offset });
}

export async function getUserActivityLogs(
  userId: string,
  limit = 50,
  offset = 0
): Promise<ActivityLogResult> {
  return getActivityLogs({ userId, limit, offset });
}

export async function getOrganizationActivityLogs(
  orgId: string,
  limit = 50,
  offset = 0
): Promise<ActivityLogResult> {
  return getActivityLogs({ orgId, limit, offset });
}

export async function deleteOldActivityLogs(olderThanDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.change_log.deleteMany({
    where: {
      created_at: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
