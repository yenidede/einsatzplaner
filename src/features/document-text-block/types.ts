import type { pdfTemplate } from '@/generated/prisma';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';

export const DOCUMENT_TEXT_BLOCK_DOCUMENT_TYPE = 'DOCUMENT_TEXT_BLOCK_V1';
export const DOCUMENT_TEXT_BLOCK_CONTENT_KIND = 'DOCUMENT_TEXT_BLOCK_V1';

export interface DocumentTextBlockContent {
  kind: typeof DOCUMENT_TEXT_BLOCK_CONTENT_KIND;
  version: 1;
  description: string;
  category: string;
  plainText: string;
  document: DocumentTemplateRichTextNode;
  seedKey?: string;
}

export interface DocumentTextBlock {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: string;
  plainText: string;
  document: DocumentTemplateRichTextNode;
  seedKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PrismaDocumentTextBlock = pdfTemplate;
