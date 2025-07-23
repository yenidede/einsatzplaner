"use server";

import prisma from "@/lib/prisma";
import type { einsatz as Einsatz } from "@/generated/prisma";
import type { EinsatzForCalendar } from "@/features/einsatz/types";

// TODO: Create auth layer that calls the underlying DAL functions
export async function getAllEinsaetze(org_ids: string[]) {
  return getAllEinsaetzeFromDb(org_ids);
}

export async function getAllEinsaetzeForCalendar(org_ids: string[]) {
  return getAllEinsatzeForCalendarFromDb(org_ids);
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
): Promise<Einsatz | null> {
  return prisma.einsatz.findUnique({
    where: { id: einsatzId },
    include: {
      einsatz_helper: {
        select: {
          joined_at: true,
        },
        include: {
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
          created_at: true,
          comment: true,
        },
        include: {
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
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
          change_type: true,
          created_at: true,
        },
      },
      einsatz_field: {
        select: {
          value: true,
        },
        include: {
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
