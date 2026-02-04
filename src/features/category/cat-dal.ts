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

export type CreateCategoryInput = {
  org_id: string;
  value: string;
  abbreviation?: string;
};

export type UpdateCategoryInput = {
  value?: string;
  abbreviation?: string;
};

export async function createCategory(
  input: CreateCategoryInput
): Promise<EinsatzCategory> {
  if (input.value.trim() === '') {
    throw new Error('Kategoriename darf nicht leer sein');
  }

  return prisma.einsatz_category.create({
    data: {
      org_id: input.org_id,
      value: input.value.trim(),
      abbreviation: (input.abbreviation ?? '').trim(),
    },
  });
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<EinsatzCategory> {
  if (input.value?.trim() === '') {
    throw new Error('Kategoriename darf nicht leer sein');
  }

  return prisma.einsatz_category.update({
    where: { id },
    data: {
      ...(input.value !== undefined && { value: input.value.trim() }),
      ...(input.abbreviation !== undefined && {
        abbreviation: input.abbreviation.trim(),
      }),
    },
  });
}

export async function deleteCategory(id: string): Promise<EinsatzCategory> {
  return prisma.einsatz_category.delete({
    where: { id },
  });
}
