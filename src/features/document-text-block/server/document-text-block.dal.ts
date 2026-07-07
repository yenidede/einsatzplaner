'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import {
  DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE,
  type PrismaDocumentTextBlock,
} from '../types';
import { normalizeDocumentTextBlockContent } from '../lib/document-text-block-storage';

const DOCUMENT_TEXT_BLOCK_SEED_MARKER_TYPE =
  'DOCUMENT_TEXT_BLOCK_SEED_MARKER_V1';

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

export async function hasDocumentTextBlockSeedMarker(
  organizationId: string
): Promise<boolean> {
  const marker = await prisma.pdfTemplate.findFirst({
    where: {
      organizationId,
      documentType: DOCUMENT_TEXT_BLOCK_SEED_MARKER_TYPE,
    },
    select: { id: true },
  });
  return marker !== null;
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

export async function initializeDocumentTextBlockRecords(
  organizationId: string,
  seeds: Array<{
    seedKey: string;
    name: string;
    contentJson: Prisma.InputJsonValue;
  }>
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${organizationId}),
        hashtext(${DOCUMENT_TEXT_BLOCK_SEED_MARKER_TYPE})
      )
    `;

    const marker = await transaction.pdfTemplate.findFirst({
      where: {
        organizationId,
        documentType: DOCUMENT_TEXT_BLOCK_SEED_MARKER_TYPE,
      },
      select: { id: true },
    });
    if (marker) return;

    const existingRows = await transaction.pdfTemplate.findMany({
      where: {
        organizationId,
        documentType: DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE,
      },
      select: { name: true, contentJson: true },
    });

    for (const seed of seeds) {
      const alreadyExists = existingRows.some((row) => {
        const content = normalizeDocumentTextBlockContent(row.contentJson);
        return (
          content?.seedKey === seed.seedKey ||
          row.name === seed.name ||
          (content?.category === 'Einsatzplaner' &&
            row.name.startsWith(seed.name))
        );
      });
      if (alreadyExists) continue;

      await transaction.pdfTemplate.create({
        data: {
          organizationId,
          name: seed.name,
          documentType: DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE,
          contentJson: seed.contentJson,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    await transaction.pdfTemplate.create({
      data: {
        organizationId,
        name: 'Textbausteine initialisiert',
        documentType: DOCUMENT_TEXT_BLOCK_SEED_MARKER_TYPE,
        contentJson: {
          kind: DOCUMENT_TEXT_BLOCK_SEED_MARKER_TYPE,
          version: 1,
        },
        isActive: false,
        updatedAt: new Date(),
      },
    });
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
