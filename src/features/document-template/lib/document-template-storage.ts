import type { Prisma } from '@/generated/prisma';
import type {
  DocumentTemplateBlock,
  DocumentTemplateContent,
  DocumentTemplatePageArea,
  DocumentTemplatePageSettings,
  DocumentTemplateRichTextMark,
  DocumentTemplateRichTextNode,
} from '@/features/document-template/types';
import { DOCUMENT_TEMPLATE_CONTENT_KIND } from '@/features/document-template/types';
import {
  createDefaultDocumentTemplateContent,
  createDefaultDocumentTemplatePageSettings,
} from './document-template-defaults';

type DocumentTemplateTableRow = {
  id: string;
  label: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlockType(value: unknown): value is DocumentTemplateBlock['type'] {
  return (
    value === 'heading' ||
    value === 'paragraph' ||
    value === 'infoBox' ||
    value === 'dataTable' ||
    value === 'divider' ||
    value === 'image' ||
    value === 'signature' ||
    value === 'field' ||
    value === 'pageBreak' ||
    value === 'header' ||
    value === 'footer'
  );
}

function normalizeAttrs(
  value: unknown
): Record<string, string | number | boolean | null> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string | number | boolean | null] =>
      typeof entry[1] === 'string' ||
      typeof entry[1] === 'number' ||
      typeof entry[1] === 'boolean' ||
      entry[1] === null
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeMarks(
  value: unknown
): DocumentTemplateRichTextMark[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const marks = value
    .map((mark): DocumentTemplateRichTextMark | null => {
      if (!isRecord(mark) || typeof mark.type !== 'string') return null;
      return {
        type: mark.type,
        attrs: normalizeAttrs(mark.attrs),
      };
    })
    .filter((mark): mark is DocumentTemplateRichTextMark => Boolean(mark));

  return marks.length > 0 ? marks : undefined;
}

function normalizeRichTextNode(
  value: unknown
): DocumentTemplateRichTextNode | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  const content = Array.isArray(value.content)
    ? value.content
        .map(normalizeRichTextNode)
        .filter((node): node is DocumentTemplateRichTextNode => Boolean(node))
    : undefined;

  return {
    type: value.type,
    text: typeof value.text === 'string' ? value.text : undefined,
    attrs: normalizeAttrs(value.attrs),
    marks: normalizeMarks(value.marks),
    content,
  };
}

function normalizeBlock(value: unknown): DocumentTemplateBlock | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isBlockType(value.type)
  ) {
    return null;
  }

  const rows = Array.isArray(value.rows)
    ? value.rows
        .map((row): DocumentTemplateTableRow | null => {
          if (
            !isRecord(row) ||
            typeof row.id !== 'string' ||
            typeof row.label !== 'string' ||
            typeof row.value !== 'string'
          ) {
            return null;
          }

          return {
            id: row.id,
            label: row.label,
            value: row.value,
          };
        })
        .filter((row): row is DocumentTemplateTableRow => Boolean(row))
    : undefined;

  return {
    id: value.id,
    type: value.type,
    title: typeof value.title === 'string' ? value.title : undefined,
    text: typeof value.text === 'string' ? value.text : undefined,
    fieldKey: typeof value.fieldKey === 'string' ? value.fieldKey : undefined,
    align:
      value.align === 'center' || value.align === 'right'
        ? value.align
        : value.align === 'left'
          ? 'left'
          : undefined,
    fontSize: typeof value.fontSize === 'number' ? value.fontSize : undefined,
    spacingTop:
      typeof value.spacingTop === 'number' ? value.spacingTop : undefined,
    spacingBottom:
      typeof value.spacingBottom === 'number' ? value.spacingBottom : undefined,
    background:
      value.background === 'muted' || value.background === 'accent'
        ? value.background
        : value.background === 'none'
          ? 'none'
          : undefined,
    multiSelectFormat:
      value.multiSelectFormat === 'list' ||
      value.multiSelectFormat === 'line_break'
        ? value.multiSelectFormat
        : value.multiSelectFormat === 'comma'
          ? 'comma'
          : undefined,
    rows,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : undefined,
    altText: typeof value.altText === 'string' ? value.altText : undefined,
    richText: normalizeRichTextNode(value.richText) ?? undefined,
    width: typeof value.width === 'number' ? value.width : undefined,
    height: typeof value.height === 'number' ? value.height : undefined,
    keepAspectRatio:
      typeof value.keepAspectRatio === 'boolean'
        ? value.keepAspectRatio
        : undefined,
    logoSource:
      value.logoSource === 'custom' || value.logoSource === 'organization'
        ? value.logoSource
        : undefined,
    showOrganizationName:
      typeof value.showOrganizationName === 'boolean'
        ? value.showOrganizationName
        : undefined,
    showContactInfo:
      typeof value.showContactInfo === 'boolean'
        ? value.showContactInfo
        : undefined,
    showDivider:
      typeof value.showDivider === 'boolean' ? value.showDivider : undefined,
    showPageNumber:
      typeof value.showPageNumber === 'boolean'
        ? value.showPageNumber
        : undefined,
  };
}

function normalizePageArea(
  value: unknown,
  fallback: DocumentTemplatePageArea
): DocumentTemplatePageArea {
  if (!isRecord(value)) {
    return fallback;
  }

  const storedBlocks = Array.isArray(value.blocks) ? value.blocks : null;
  const blocks = storedBlocks
    ? storedBlocks
        .map(normalizeBlock)
        .filter((block): block is DocumentTemplateBlock => Boolean(block))
    : fallback.blocks;

  return {
    enabled:
      typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled,
    height: typeof value.height === 'number' ? value.height : fallback.height,
    showOn:
      value.showOn === 'firstPage' || value.showOn === 'allPages'
        ? value.showOn
        : fallback.showOn,
    blocks,
  };
}

function normalizePageSettings(value: unknown): DocumentTemplatePageSettings {
  const fallback = createDefaultDocumentTemplatePageSettings();
  if (!isRecord(value)) {
    return fallback;
  }

  const margins = isRecord(value.margins) ? value.margins : {};

  return {
    format: 'A4',
    orientation:
      value.orientation === 'landscape' || value.orientation === 'portrait'
        ? value.orientation
        : fallback.orientation,
    margins: {
      top:
        typeof margins.top === 'number' ? margins.top : fallback.margins.top,
      right:
        typeof margins.right === 'number'
          ? margins.right
          : fallback.margins.right,
      bottom:
        typeof margins.bottom === 'number'
          ? margins.bottom
          : fallback.margins.bottom,
      left:
        typeof margins.left === 'number'
          ? margins.left
          : fallback.margins.left,
    },
    header: normalizePageArea(value.header, fallback.header),
    footer: normalizePageArea(value.footer, fallback.footer),
  };
}

export function normalizeDocumentTemplateContent(
  value: unknown
): DocumentTemplateContent {
  if (!isRecord(value) || value.kind !== DOCUMENT_TEMPLATE_CONTENT_KIND) {
    return createDefaultDocumentTemplateContent();
  }

  const meta = isRecord(value.meta) ? value.meta : {};
  const storedBlocks = Array.isArray(value.blocks) ? value.blocks : null;
  const blocks = storedBlocks
    ? storedBlocks
        .map(normalizeBlock)
        .filter((block): block is DocumentTemplateBlock => Boolean(block))
    : [];

  return {
    kind: DOCUMENT_TEMPLATE_CONTENT_KIND,
    version: 1,
    meta: {
      description: typeof meta.description === 'string' ? meta.description : '',
      defaultFormat:
        meta.defaultFormat === 'pdf' || meta.defaultFormat === 'docx'
          ? meta.defaultFormat
          : 'docx',
      isDefault: typeof meta.isDefault === 'boolean' ? meta.isDefault : false,
      sampleEinsatzId:
        typeof meta.sampleEinsatzId === 'string' ? meta.sampleEinsatzId : null,
    },
    page: normalizePageSettings(value.page),
    blocks: storedBlocks
      ? blocks
      : createDefaultDocumentTemplateContent().blocks,
    document:
      normalizeRichTextNode(value.document) ??
      createDefaultDocumentTemplateContent().document,
  };
}

export function serializeDocumentTemplateContent(
  content: DocumentTemplateContent
): Prisma.InputJsonValue {
  return {
    kind: DOCUMENT_TEMPLATE_CONTENT_KIND,
    version: 1,
    meta: {
      description: content.meta.description,
      defaultFormat: content.meta.defaultFormat ?? 'docx',
      isDefault: content.meta.isDefault,
      sampleEinsatzId: content.meta.sampleEinsatzId,
    },
    page: {
      format: content.page.format,
      orientation: content.page.orientation,
      margins: content.page.margins,
      header: {
        enabled: content.page.header.enabled,
        height: content.page.header.height,
        showOn: content.page.header.showOn,
        blocks: content.page.header.blocks.map(serializeBlock),
      },
      footer: {
        enabled: content.page.footer.enabled,
        height: content.page.footer.height,
        showOn: content.page.footer.showOn,
        blocks: content.page.footer.blocks.map(serializeBlock),
      },
    },
    document: content.document
      ? serializeRichTextNode(content.document)
      : undefined,
    blocks: content.blocks.map(serializeBlock),
  };
}

function serializeBlock(block: DocumentTemplateBlock): Prisma.InputJsonValue {
  return {
    id: block.id,
    type: block.type,
    title: block.title,
    text: block.text,
    fieldKey: block.fieldKey,
    align: block.align,
    fontSize: block.fontSize,
    spacingTop: block.spacingTop,
    spacingBottom: block.spacingBottom,
    background: block.background,
    multiSelectFormat: block.multiSelectFormat,
    imageUrl: block.imageUrl,
    altText: block.altText,
    richText: block.richText ? serializeRichTextNode(block.richText) : undefined,
    width: block.width,
    height: block.height,
    keepAspectRatio: block.keepAspectRatio,
    logoSource: block.logoSource,
    showOrganizationName: block.showOrganizationName,
    showContactInfo: block.showContactInfo,
    showDivider: block.showDivider,
    showPageNumber: block.showPageNumber,
    rows: block.rows?.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
    })),
  };
}

function serializeRichTextNode(
  node: DocumentTemplateRichTextNode
): Prisma.InputJsonValue {
  return {
    type: node.type,
    text: node.text,
    attrs: node.attrs
      ? Object.fromEntries(
          Object.entries(node.attrs).map(([key, value]) => [key, value])
        )
      : undefined,
    marks: node.marks?.map((mark) => ({
      type: mark.type,
      attrs: mark.attrs
        ? Object.fromEntries(
            Object.entries(mark.attrs).map(([key, value]) => [key, value])
          )
        : undefined,
    })),
    content: node.content?.map(serializeRichTextNode),
  };
}
