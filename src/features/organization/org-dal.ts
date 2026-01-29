'use server';

import prisma from '@/lib/prisma';
import type { OrganizationBasicVisualize } from '@/features/organization/types';

/** Returns organizations including default_starttime and default_endtime for event dialog defaults. */
export async function getOrganizationsByIds(org_ids: string[]) {
  return prisma.organization.findMany({
    where: { id: { in: org_ids } },
    select: {
      id: true,
      name: true,
      logo_url: true,
      description: true,
      helper_name_singular: true,
      helper_name_plural: true,
      created_at: true,
      updated_at: true,
      einsatz_name_singular: true,
      einsatz_name_plural: true,
      email: true,
      phone: true,
      helferansicht_description: true,
      verwalteransicht_description: true,
      abbreviation: true,
      max_participants_per_helper: true,
      allow_self_sign_out: true,
      default_starttime: true,
      default_endtime: true,
      small_logo_url: true,
    },
  });
}

export async function getBasicVisualOrganizationsByIds(
  org_ids: string[]
): Promise<OrganizationBasicVisualize[]> {
  return prisma.organization.findMany({
    where: { id: { in: org_ids } },
    select: {
      id: true,
      name: true,
      logo_url: true,
    },
  });
}
