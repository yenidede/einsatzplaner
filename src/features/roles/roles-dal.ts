'use server';

import prisma from '@/lib/prisma';
import { unstable_cache as cache, revalidateTag } from 'next/cache';
import type { role as Role } from '@/generated/prisma';

export async function getAllRoles() {
  try {
    return cache(
      async (): Promise<Role[]> => prisma.role.findMany(),
      ['roles'],
      { tags: ['roles'], revalidate: 3600 } // 1h TTL
    )();
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
}

// call this after any role create/update/delete
export async function revalidateRoles() {
  revalidateTag('roles');
}
