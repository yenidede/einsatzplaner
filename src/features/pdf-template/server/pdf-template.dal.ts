'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type { PrismaPdfTemplate } from '../types';

export async function findPdfTemplatesByOrganization(
  organizationId: string
): Promise<PrismaPdfTemplate[]> {
  return prisma.pdfTemplate.findMany({
    where: { organizationId },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function findPdfTemplateById(
  id: string
): Promise<PrismaPdfTemplate | null> {
  return prisma.pdfTemplate.findUnique({
    where: { id },
  });
}

export async function createPdfTemplateRecord(data: {
  organizationId: string;
  name: string;
  documentType: string;
  contentJson: Prisma.InputJsonValue;
  isActive: boolean;
}): Promise<PrismaPdfTemplate> {
  return prisma.pdfTemplate.create({
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function updatePdfTemplateRecord(
  id: string,
  data: Partial<Pick<PrismaPdfTemplate, 'name' | 'documentType' | 'isActive'>> & {
    contentJson?: Prisma.InputJsonValue;
  }
): Promise<PrismaPdfTemplate> {
  return prisma.pdfTemplate.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deletePdfTemplateRecord(id: string): Promise<void> {
  await prisma.pdfTemplate.delete({
    where: { id },
  });
}

export async function findLatestEinsaetzeForPdfPreview(
  organizationId: string
): Promise<Array<{ id: string; title: string; start: Date }>> {
  return prisma.einsatz.findMany({
    where: { org_id: organizationId },
    select: {
      id: true,
      title: true,
      start: true,
    },
    orderBy: [{ start: 'desc' }],
    take: 20,
  });
}
