'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';
import {
  DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
  type DocumentTextBlock,
  type PrismaDocumentTextBlock,
} from '../types';
import {
  documentText,
  hasDocumentText,
  normalizeDocumentTextBlockContent,
  serializeDocumentTextBlockContent,
} from '../lib/document-text-block-storage';
import {
  createDocumentTextBlockRecord,
  deleteDocumentTextBlockRecord,
  findDocumentTextBlockById,
  findDocumentTextBlocksByOrganization,
  updateDocumentTextBlockRecord,
  initializeDocumentTextBlockRecords,
  hasDocumentTextBlockSeedMarker,
} from './document-text-block.dal';
import { getDocumentTemplateFieldDefinitions } from '@/features/document-template/lib/document-template-fields';
import { createInitialDocumentTextBlockSeeds } from '../lib/document-text-block-seeds';

const metadataSchema = z.object({
  name: z.string().trim().min(1, 'Bitte geben Sie einen Namen ein.').max(120),
  description: z.string().trim().max(500),
  category: z.string().trim().max(80),
});

async function assertPermission(
  organizationId: string,
  action: 'templates:read' | 'templates:create' | 'templates:update' | 'templates:delete'
) {
  const { session } = await requireAuth();
  if (!(await hasPermission(session, action, organizationId))) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }
}

function mapRow(row: PrismaDocumentTextBlock): DocumentTextBlock {
  const content = normalizeDocumentTextBlockContent(row.contentJson);
  if (!content) throw new Error('Der Textbaustein enthält ungültige Daten.');
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: content.description,
    category: content.category,
    plainText: content.plainText,
    document: content.document,
    seedKey: content.seedKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validateDocument(document: DocumentTemplateRichTextNode) {
  if (document.type !== 'doc' || !hasDocumentText(document)) {
    throw new Error('Der Textbaustein darf nicht leer sein.');
  }
}

function revalidate(organizationId: string) {
  revalidatePath(`/settings/org/${organizationId}`);
  revalidatePath(`/settings/org/${organizationId}/document-templates`);
}

export async function getDocumentTextBlocks(
  organizationId: string
): Promise<DocumentTextBlock[]> {
  await assertPermission(organizationId, 'templates:read');
  if (!(await hasDocumentTextBlockSeedMarker(organizationId))) {
    const fieldDefinitions = await getDocumentTemplateFieldDefinitions(
      organizationId
    );
    const seeds = createInitialDocumentTextBlockSeeds(fieldDefinitions);
    await initializeDocumentTextBlockRecords(
      organizationId,
      seeds.map((seed) => ({
        seedKey: seed.seedKey,
        name: seed.name,
        contentJson: serializeDocumentTextBlockContent({
          kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
          version: 1,
          description: seed.description,
          category: '',
          plainText: documentText(seed.document),
          document: seed.document,
          seedKey: seed.seedKey,
        }),
      }))
    );
  }
  const rows = await findDocumentTextBlocksByOrganization(organizationId);
  return rows.map(mapRow);
}

export async function createDocumentTextBlock(data: {
  organizationId: string;
  name: string;
  description: string;
  category: string;
  document: DocumentTemplateRichTextNode;
}): Promise<DocumentTextBlock> {
  await assertPermission(data.organizationId, 'templates:create');
  const metadata = metadataSchema.parse(data);
  validateDocument(data.document);
  const row = await createDocumentTextBlockRecord({
    organizationId: data.organizationId,
    name: metadata.name,
    contentJson: serializeDocumentTextBlockContent({
      kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
      version: 1,
      description: metadata.description,
      category: metadata.category,
      plainText: documentText(data.document),
      document: data.document,
    }),
  });
  revalidate(data.organizationId);
  return mapRow(row);
}

export async function updateDocumentTextBlock(data: {
  id: string;
  name: string;
  description: string;
  category: string;
  document: DocumentTemplateRichTextNode;
}): Promise<DocumentTextBlock> {
  const existing = await findDocumentTextBlockById(data.id);
  if (!existing) throw new NotFoundError('Textbaustein nicht gefunden');
  await assertPermission(existing.organizationId, 'templates:update');
  const metadata = metadataSchema.parse(data);
  validateDocument(data.document);
  const current = mapRow(existing);
  const row = await updateDocumentTextBlockRecord(data.id, {
    name: metadata.name,
    contentJson: serializeDocumentTextBlockContent({
      kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
      version: 1,
      description: metadata.description,
      category: metadata.category,
      plainText: documentText(data.document),
      document: data.document,
      seedKey: current.seedKey,
    }),
  });
  revalidate(existing.organizationId);
  return mapRow(row);
}

export async function duplicateDocumentTextBlock(id: string) {
  const existing = await findDocumentTextBlockById(id);
  if (!existing) throw new NotFoundError('Textbaustein nicht gefunden');
  await assertPermission(existing.organizationId, 'templates:create');
  const current = mapRow(existing);
  return createDocumentTextBlock({
    organizationId: current.organizationId,
    name: `${current.name} (Kopie)`,
    description: current.description,
    category: current.category,
    document: current.document,
  });
}

export async function deleteDocumentTextBlock(id: string): Promise<void> {
  const existing = await findDocumentTextBlockById(id);
  if (!existing) throw new NotFoundError('Textbaustein nicht gefunden');
  await assertPermission(existing.organizationId, 'templates:delete');
  await deleteDocumentTextBlockRecord(id);
  revalidate(existing.organizationId);
}
