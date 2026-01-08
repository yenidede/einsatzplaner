'use server';

import { unstable_cache as cache, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import type { einsatz_status as EinsatzStatus } from '@/generated/prisma';

const getStatusesCached = cache(
  async (): Promise<EinsatzStatus[]> => prisma.einsatz_status.findMany(),
  ['status'],
  { tags: ['status'], revalidate: 3600 } // 1h TTL
);

export async function GetStatuses() {
  return getStatusesCached();
}

export async function GetStatusById(id: string) {
  const statuses = await getStatusesCached();
  return statuses.find((s) => s.id === id) ?? null;
}

// call this after any status create/update/delete
export async function revalidateStatuses() {
  revalidateTag('status');
}
