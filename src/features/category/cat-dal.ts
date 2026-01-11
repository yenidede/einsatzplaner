'use server';

import prisma from '@/lib/prisma';
import type { einsatz_category as EinsatzCategory } from '@/generated/prisma';

export async function getCategoriesByOrgIds(
  org_ids: string[]
): Promise<EinsatzCategory[]> {
  return prisma.einsatz_category.findMany({
    where: {
      org_id: { in: org_ids },
    },
    orderBy: {
      value: 'asc',
    },
  });
}
