"use server";

import prisma from "@/lib/prisma";

export async function getOrganizationsByIds(org_ids: string[]) {
  return prisma.organization.findMany({
    where: { id: { in: org_ids } },
  });
}
