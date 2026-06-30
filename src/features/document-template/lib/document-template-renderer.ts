import type {
  DocumentTemplateBlock,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';

const placeholderPattern = /\{\{([^}]+)\}\}/g;

function mojibake(value: string): string {
  return String.fromCharCode(...new TextEncoder().encode(value));
}

function doubleMojibake(value: string): string {
  return mojibake(mojibake(value));
}

const mojibakeReplacements: Array<[string, string]> = [
  [doubleMojibake('Ä'), 'Ä'],
  [doubleMojibake('Ö'), 'Ö'],
  [doubleMojibake('Ü'), 'Ü'],
  [doubleMojibake('ä'), 'ä'],
  [doubleMojibake('ö'), 'ö'],
  [doubleMojibake('ü'), 'ü'],
  [doubleMojibake('ß'), 'ß'],
  [doubleMojibake('·'), '·'],
  [doubleMojibake('—'), '—'],
  [doubleMojibake('–'), '–'],
  [doubleMojibake('•'), '•'],
  [doubleMojibake('€'), '€'],
  [mojibake('Ä'), 'Ä'],
  [mojibake('Ö'), 'Ö'],
  [mojibake('Ü'), 'Ü'],
  [mojibake('ä'), 'ä'],
  [mojibake('ö'), 'ö'],
  [mojibake('ü'), 'ü'],
  [mojibake('ß'), 'ß'],
  [mojibake('·'), '·'],
  [mojibake(' '), ' '],
  [mojibake('—'), '—'],
  [mojibake('–'), '–'],
  [mojibake('•'), '•'],
  [mojibake('€'), '€'],
  [mojibake('„'), '„'],
  [mojibake('“'), '“'],
  [mojibake('‘'), '‘'],
  [mojibake('’'), '’'],
];

export function normalizeTemplateText(value: string): string {
  return mojibakeReplacements.reduce(
    (result, [broken, replacement]) => result.replaceAll(broken, replacement),
    value
  );
}

export function missingTemplateValue(): string {
  return '—';
}

export function resolveTemplateText(
  value: string | null | undefined,
  fields: ResolvedDocumentTemplateFields
) {
  if (!value) {
    return '';
  }

  return normalizeTemplateText(value).replace(
    placeholderPattern,
    (_match, rawKey: string) => {
      const key = rawKey.trim();
      return normalizeTemplateText(
        fields[key]?.formattedValue ?? missingTemplateValue()
      );
    }
  );
}

export function extractTemplateTextParts(
  value: string | null | undefined,
  fields: ResolvedDocumentTemplateFields
): Array<{ kind: 'text' | 'field'; value: string; label?: string }> {
  if (!value) {
    return [];
  }

  const normalizedValue = normalizeTemplateText(value);
  const parts: Array<{
    kind: 'text' | 'field';
    value: string;
    label?: string;
  }> = [];
  let lastIndex = 0;
  let match = placeholderPattern.exec(normalizedValue);

  while (match) {
    const index = match.index;
    if (index > lastIndex) {
      parts.push({
        kind: 'text',
        value: normalizedValue.slice(lastIndex, index),
      });
    }

    const key = match[1]?.trim() ?? '';
    parts.push({
      kind: 'field',
      value: normalizeTemplateText(
        fields[key]?.formattedValue ?? missingTemplateValue()
      ),
      label: fields[key]?.definition.label ?? key,
    });
    lastIndex = index + match[0].length;
    match = placeholderPattern.exec(normalizedValue);
  }

  if (lastIndex < normalizedValue.length) {
    parts.push({ kind: 'text', value: normalizedValue.slice(lastIndex) });
  }

  return parts;
}

export function blockToPlainText(
  block: DocumentTemplateBlock,
  fields: ResolvedDocumentTemplateFields
) {
  if (block.type === 'field' && block.fieldKey) {
    return normalizeTemplateText(
      fields[block.fieldKey]?.formattedValue ?? missingTemplateValue()
    );
  }

  if (block.type === 'dataTable') {
    return (
      block.rows
        ?.map((row) =>
          normalizeTemplateText(
            `${row.label}: ${resolveTemplateText(row.value, fields)}`
          )
        )
        .join('\n') ?? ''
    );
  }

  return resolveTemplateText(block.text, fields);
}
