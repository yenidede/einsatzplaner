import type { Template } from '@pdfme/common';
import type { PdfTemplateInput } from '../types';

const SAFE_PNG_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aYkAAAAASUVORK5CYII=';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isImageSchema(value: unknown): value is Template['schemas'][number][number] {
  return isRecord(value) && value.type === 'image' && typeof value.name === 'string';
}

function isSupportedImageSource(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith('data:image/png;base64,') ||
    normalized.startsWith('data:image/jpeg;base64,') ||
    normalized.startsWith('data:image/jpg;base64,')
  ) {
    return true;
  }

  return false;
}

export function applyImageBindingsToTemplate(args: {
  template: Template;
  input?: PdfTemplateInput;
}): Template {
  const input = args.input ?? {};

  return {
    ...args.template,
    schemas: args.template.schemas.map((page) =>
      page.flatMap((schema) => {
        if (!isRecord(schema) || typeof schema.name !== 'string') {
          return [];
        }

        if (!isImageSchema(schema)) {
          return [schema];
        }

        const mappedValue = input[schema.name];
        const rawContent =
          typeof mappedValue === 'string' && mappedValue.trim()
            ? mappedValue.trim()
            : typeof schema.content === 'string'
              ? schema.content
              : '';
        const content = isSupportedImageSource(rawContent)
          ? rawContent
          : SAFE_PNG_PLACEHOLDER;

        return [
          {
            ...schema,
            content,
          },
        ];
      })
    ),
  };
}
