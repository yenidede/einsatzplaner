import type { Prisma } from '@/generated/prisma';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';
import {
  DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
  type DocumentTextBlockContent,
} from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeNode(value: unknown): DocumentTemplateRichTextNode | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  const content = Array.isArray(value.content)
    ? value.content
        .map(normalizeNode)
        .filter((node): node is DocumentTemplateRichTextNode => node !== null)
    : undefined;
  const marks = Array.isArray(value.marks)
    ? value.marks
        .filter(isRecord)
        .filter((mark) => typeof mark.type === 'string')
        .map((mark) => ({
          type: String(mark.type),
          ...(isRecord(mark.attrs) ? { attrs: normalizeAttrs(mark.attrs) } : {}),
        }))
    : undefined;
  const attrs = isRecord(value.attrs) ? normalizeAttrs(value.attrs) : undefined;

  return {
    type: value.type,
    ...(typeof value.text === 'string' ? { text: value.text } : {}),
    ...(content ? { content } : {}),
    ...(marks ? { marks } : {}),
    ...(attrs ? { attrs } : {}),
  };
}

function normalizeAttrs(
  value: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  const entries: Array<[string, string | number | boolean | null]> = [];
  for (const [key, entry] of Object.entries(value)) {
    if (
      entry === null ||
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean'
    ) {
      entries.push([key, entry]);
    }
  }
  return Object.fromEntries(entries);
}

function serializeNode(node: DocumentTemplateRichTextNode): Prisma.InputJsonObject {
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.attrs ? { attrs: node.attrs } : {}),
    ...(node.marks ? { marks: node.marks.map((mark) => ({
      type: mark.type,
      ...(mark.attrs ? { attrs: mark.attrs } : {}),
    })) } : {}),
    ...(node.content ? { content: node.content.map(serializeNode) } : {}),
  };
}

export function normalizeDocumentTextBlockContent(
  value: unknown
): DocumentTextBlockContent | null {
  if (!isRecord(value) || value.kind !== DOCUMENT_TEXT_BLOCK_CONTENT_KIND) {
    return null;
  }
  const document = normalizeNode(value.document);
  if (!document || document.type !== 'doc') return null;

  return {
    kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
    version: 1,
    description: typeof value.description === 'string' ? value.description : '',
    category: typeof value.category === 'string' ? value.category : '',
    plainText: typeof value.plainText === 'string' ? value.plainText : '',
    document,
    ...(typeof value.seedKey === 'string' ? { seedKey: value.seedKey } : {}),
  };
}

export function serializeDocumentTextBlockContent(
  content: DocumentTextBlockContent
): Prisma.InputJsonValue {
  return {
    kind: DOCUMENT_TEXT_BLOCK_CONTENT_KIND,
    version: 1,
    description: content.description,
    category: content.category,
    plainText: content.plainText,
    document: serializeNode(content.document),
    ...(content.seedKey ? { seedKey: content.seedKey } : {}),
  };
}

export function documentText(node: DocumentTemplateRichTextNode): string {
  if (node.text) return node.text;
  if (node.type === 'dynamicField' && typeof node.attrs?.fieldKey === 'string') {
    return `{{${node.attrs.fieldKey}}}`;
  }
  return (node.content ?? [])
    .map(documentText)
    .filter(Boolean)
    .join(node.type === 'doc' ? '\n' : ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

export function hasDocumentText(node: DocumentTemplateRichTextNode): boolean {
  return documentText(node).length > 0;
}
