'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import {
  DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE,
  type PrismaDocumentTextBlock,
} from '../types';

export async function findDocumentTextBlocksByOrganization(
  organizationId: string
): Promise<PrismaDocumentTextBlock[]> {
  return prisma.pdfTemplate.findMany({
    where: { organizationId, documentType: DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE },
    orderBy: [{ name: 'asc' }, { updatedAt: 'desc' }],
  });
}

export async function findDocumentTextBlockById(
  id: string
): Promise<PrismaDocumentTextBlock | null> {
  return prisma.pdfTemplate.findFirst({
    where: { id, documentType: DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE },
  });
}

export async function createDocumentTextBlockRecord(data: {
  organizationId: string;
  name: string;
  contentJson: Prisma.InputJsonValue;
}): Promise<PrismaDocumentTextBlock> {
  return prisma.pdfTemplate.create({
    data: {
      ...data,
      documentType: DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE,
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

export async function updateDocumentTextBlockRecord(
  id: string,
  data: { name: string; contentJson: Prisma.InputJsonValue }
): Promise<PrismaDocumentTextBlock> {
  return prisma.pdfTemplate.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
  });
}

export async function deleteDocumentTextBlockRecord(id: string): Promise<void> {
  await prisma.pdfTemplate.delete({ where: { id } });
}
