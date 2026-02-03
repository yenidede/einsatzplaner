'use server';

import prisma from '@/lib/prisma';
import type { OrganizationBasicVisualize } from '@/features/organization/types';

export async function getOrganizationsByIds(org_ids: string[]) {
  return prisma.organization.findMany({
    where: { id: { in: org_ids } },
    orderBy: { name: 'asc' },
  });
}

export async function getBasicVisualOrganizationsByIds(
  org_ids: string[]
): Promise<OrganizationBasicVisualize[]> {
  return prisma.organization.findMany({
    where: { id: { in: org_ids } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      logo_url: true,
    },
  });
}
