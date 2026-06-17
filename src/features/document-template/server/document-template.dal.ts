'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type { PrismaDocumentTemplate } from '@/features/document-template/types';
import { DOCUMENT_TEMPLATE_DOCUMENT_TYPE } from '@/features/document-template/types';

export async function findDocumentTemplatesByOrganization(
  organizationId: string
): Promise<PrismaDocumentTemplate[]> {
  return prisma.pdfTemplate.findMany({
    where: {
      organizationId,
      documentType: DOCUMENT_TEMPLATE_DOCUMENT_TYPE,
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function findDocumentTemplateById(
  id: string
): Promise<PrismaDocumentTemplate | null> {
  return prisma.pdfTemplate.findFirst({
    where: {
      id,
      documentType: DOCUMENT_TEMPLATE_DOCUMENT_TYPE,
    },
  });
}

export async function createDocumentTemplateRecord(data: {
  organizationId: string;
  name: string;
  contentJson: Prisma.InputJsonValue;
  isActive: boolean;
}): Promise<PrismaDocumentTemplate> {
  return prisma.pdfTemplate.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      documentType: DOCUMENT_TEMPLATE_DOCUMENT_TYPE,
      contentJson: data.contentJson,
      isActive: data.isActive,
      updatedAt: new Date(),
    },
  });
}

export async function updateDocumentTemplateRecord(
  id: string,
  data: {
    name?: string;
    contentJson?: Prisma.InputJsonValue;
    isActive?: boolean;
  }
): Promise<PrismaDocumentTemplate> {
  return prisma.pdfTemplate.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteDocumentTemplateRecord(id: string): Promise<void> {
  await prisma.pdfTemplate.delete({
    where: { id },
  });
}
