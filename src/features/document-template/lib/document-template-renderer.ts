import type {
  DocumentTemplateBlock,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';

const placeholderPattern = /\{\{([^}]+)\}\}/g;

export function resolveTemplateText(
  value: string | null | undefined,
  fields: ResolvedDocumentTemplateFields
) {
  if (!value) {
    return '';
  }

  return value.replace(placeholderPattern, (_match, rawKey: string) => {
    const key = rawKey.trim();
    return fields[key]?.formattedValue ?? '—';
  });
}

export function extractTemplateTextParts(
  value: string | null | undefined,
  fields: ResolvedDocumentTemplateFields
): Array<{ kind: 'text' | 'field'; value: string; label?: string }> {
  if (!value) {
    return [];
  }

  const parts: Array<{
    kind: 'text' | 'field';
    value: string;
    label?: string;
  }> = [];
  let lastIndex = 0;
  let match = placeholderPattern.exec(value);

  while (match) {
    const index = match.index;
    if (index > lastIndex) {
      parts.push({ kind: 'text', value: value.slice(lastIndex, index) });
    }

    const key = match[1]?.trim() ?? '';
    parts.push({
      kind: 'field',
      value: fields[key]?.formattedValue ?? '—',
      label: fields[key]?.definition.label ?? key,
    });
    lastIndex = index + match[0].length;
    match = placeholderPattern.exec(value);
  }

  if (lastIndex < value.length) {
    parts.push({ kind: 'text', value: value.slice(lastIndex) });
  }

  return parts;
}

export function blockToPlainText(
  block: DocumentTemplateBlock,
  fields: ResolvedDocumentTemplateFields
) {
  if (block.type === 'field' && block.fieldKey) {
    return fields[block.fieldKey]?.formattedValue ?? '—';
  }

  if (block.type === 'dataTable') {
    return (
      block.rows
        ?.map(
          (row) => `${row.label}: ${resolveTemplateText(row.value, fields)}`
        )
        .join('\n') ?? ''
    );
  }

  return resolveTemplateText(block.text, fields);
}
