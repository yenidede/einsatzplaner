import type { Template } from '@pdfme/common';
import type { PdfTemplateFieldDefinition } from './types';

function generateSchemaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `pdf-field-${Date.now()}`;
}

function getNextPosition(page: Template['schemas'][number]): { x: number; y: number } {
  if (page.length === 0) {
    return { x: 20, y: 24 };
  }

  const lastSchema = [...page].sort((left, right) => {
    const leftBottom = left.position.y + left.height;
    const rightBottom = right.position.y + right.height;
    return leftBottom - rightBottom;
  })[page.length - 1];

  const nextY = lastSchema.position.y + lastSchema.height + 6;

  if (nextY <= 260) {
    return { x: 20, y: nextY };
  }

  return { x: 110, y: 24 };
}

export function insertFieldIntoTemplate(args: {
  template: Template;
  field: PdfTemplateFieldDefinition;
  pageIndex: number;
}): Template {
  const pageIndex = Math.min(
    Math.max(args.pageIndex, 0),
    Math.max(args.template.schemas.length - 1, 0)
  );
  const nextTemplate: Template = {
    ...args.template,
    schemas: args.template.schemas.map((page, index) =>
      index === pageIndex ? [...page] : page
    ),
  };
  const page = nextTemplate.schemas[pageIndex] ?? [];
  const position = getNextPosition(page);

  page.push({
    id: generateSchemaId(),
    name: args.field.key,
    type: 'text',
    position,
    width: 78,
    height: 10,
    fontSize: 11,
    readOnly: true,
    content: `{${args.field.key}}`,
  });

  nextTemplate.schemas[pageIndex] = page;

  return nextTemplate;
}

