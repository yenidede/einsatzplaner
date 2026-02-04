'use server';

import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import prisma from '@/lib/prisma';
import {
  createCategory as createCategoryDal,
  updateCategory as updateCategoryDal,
  deleteCategory as deleteCategoryDal,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './cat-dal';

export async function createCategoryAction(
  orgId: string,
  input: Omit<CreateCategoryInput, 'org_id'>
) {
  const { session } = await requireAuth();
  if (!(await hasPermission(session, 'organization:update', orgId))) {
    throw new Error(
      'Keine Berechtigung, Kategorien für diese Organisation zu bearbeiten.'
    );
  }
  return createCategoryDal({ ...input, org_id: orgId });
}

export async function updateCategoryAction(
  categoryId: string,
  orgId: string,
  input: UpdateCategoryInput
) {
  const { session } = await requireAuth();
  if (!(await hasPermission(session, 'organization:update', orgId))) {
    throw new Error(
      'Keine Berechtigung, Kategorien für diese Organisation zu bearbeiten.'
    );
  }
  const category = await prisma.einsatz_category.findFirst({
    where: { id: categoryId, org_id: orgId },
  });
  if (!category) {
    throw new Error('Kategorie nicht gefunden oder gehört nicht zu dieser Organisation.');
  }
  return updateCategoryDal(categoryId, input);
}

export async function deleteCategoryAction(categoryId: string, orgId: string) {
  const { session } = await requireAuth();
  if (!(await hasPermission(session, 'organization:update', orgId))) {
    throw new Error(
      'Keine Berechtigung, Kategorien für diese Organisation zu bearbeiten.'
    );
  }
  const category = await prisma.einsatz_category.findFirst({
    where: { id: categoryId, org_id: orgId },
  });
  if (!category) {
    throw new Error('Kategorie nicht gefunden oder gehört nicht zu dieser Organisation.');
  }
  return deleteCategoryDal(categoryId);
}
