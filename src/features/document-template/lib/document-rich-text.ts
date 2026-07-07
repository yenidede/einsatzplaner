import type {
  DocumentTemplateRichTextMark,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';

export function getRichTextNodeText(
  node: DocumentTemplateRichTextNode | undefined,
  fields: ResolvedDocumentTemplateFields
): string {
  if (!node) return '';

  if (node.type === 'text') {
    return node.text ?? '';
  }

  if (node.type === 'hardBreak') {
    return '\n';
  }

  if (node.type === 'dynamicField') {
    const fieldKey = node.attrs?.fieldKey;
    return typeof fieldKey === 'string'
      ? (fields[fieldKey]?.formattedValue ?? '—')
      : '—';
  }

  const childText = node.content
    ?.map((child) => getRichTextNodeText(child, fields))
    .join('');

  if (
    node.type === 'paragraph' ||
    node.type === 'heading' ||
    node.type === 'listItem'
  ) {
    return childText ? `${childText}\n` : '';
  }

  return childText ?? '';
}

export function hasMark(
  marks: DocumentTemplateRichTextMark[] | undefined,
  type: string
) {
  return marks?.some((mark) => mark.type === type) ?? false;
}

export function getMarkAttr(
  marks: DocumentTemplateRichTextMark[] | undefined,
  type: string,
  attr: string
) {
  const mark = marks?.find((entry) => entry.type === type);
  return mark?.attrs?.[attr];
}

