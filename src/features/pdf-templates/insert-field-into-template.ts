import type { Template } from '@pdfme/common';
import type { PdfTemplateFieldDefinition } from './types';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 20;
const DEFAULT_FIELD_WIDTH_MM = 78;
const DEFAULT_FIELD_HEIGHT_MM = 10;
const DEFAULT_FIELD_FONT_SIZE = 11;
const FOOTER_TOP_MM = 270;
const FOOTER_COLUMN_GAP_MM = 10;
const FOOTER_ROW_GAP_MM = 4;
const TRANSPARENT_IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aYkAAAAASUVORK5CYII=';
const FOOTER_FIELD_KEYS = new Set([
  'organisation_adressen',
  'organisation_bankkonten',
]);
const FOOTER_SLOTS: Record<string, { x: number; width: number; height: number }> = {
  organisation_adressen: {
    x: 20,
    width: 84,
    height: 14,
  },
  organisation_bankkonten: {
    x: 114,
    width: 76,
    height: 14,
  },
};

interface FieldDimensions {
  width: number;
  height: number;
  fontSize: number;
}

interface Position {
  x: number;
  y: number;
}

type TemplateSchema = Template['schemas'][number][number];

function generateSchemaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `pdf-field-${Date.now()}`;
}

function isFooterField(field: PdfTemplateFieldDefinition): boolean {
  return FOOTER_FIELD_KEYS.has(field.key);
}

function isImageField(field: PdfTemplateFieldDefinition): boolean {
  return field.key.includes('logo') || field.key.includes('image');
}

function isValidSchema(value: unknown): value is TemplateSchema {
  return typeof value === 'object' && value !== null;
}

function sanitizeSchema(
  schema: TemplateSchema,
  pageIndex: number,
  schemaIndex: number
): TemplateSchema {
  return {
    ...schema,
    id:
      typeof schema.id === 'string' && schema.id
        ? schema.id
        : `pdf-field-${pageIndex}-${schemaIndex}-${schema.name}`,
  };
}

function sanitizePage(
  page: Template['schemas'][number],
  pageIndex: number
): Template['schemas'][number] {
  return page
    .filter((schema) => isValidSchema(schema))
    .map((schema, schemaIndex) => sanitizeSchema(schema, pageIndex, schemaIndex));
}

function getFieldDimensions(field: PdfTemplateFieldDefinition): FieldDimensions {
  if (isImageField(field)) {
    return {
      width: 42,
      height: 24,
      fontSize: DEFAULT_FIELD_FONT_SIZE,
    };
  }

  if (field.key in FOOTER_SLOTS) {
    const slot = FOOTER_SLOTS[field.key];
    return {
      width: slot.width,
      height: slot.height,
      fontSize: 8,
    };
  }

  return {
    width: DEFAULT_FIELD_WIDTH_MM,
    height: DEFAULT_FIELD_HEIGHT_MM,
    fontSize: DEFAULT_FIELD_FONT_SIZE,
  };
}

function clampPosition(position: Position, dimensions: FieldDimensions): Position {
  return {
    x: Math.min(
      PAGE_WIDTH_MM - PAGE_PADDING_MM - dimensions.width,
      Math.max(PAGE_PADDING_MM, position.x)
    ),
    y: Math.min(
      PAGE_HEIGHT_MM - PAGE_PADDING_MM - dimensions.height,
      Math.max(PAGE_PADDING_MM, position.y)
    ),
  };
}

function getNextBodyPosition(page: Template['schemas'][number]): Position {
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

function getNextFooterPosition(
  page: Template['schemas'][number],
  field: PdfTemplateFieldDefinition,
  dimensions: FieldDimensions
): Position {
  const footerSlot = FOOTER_SLOTS[field.key];

  if (footerSlot) {
    const sameFieldSchemas = [...page].filter((schema) => schema.name === field.key);

    if (sameFieldSchemas.length === 0) {
      return {
        x: footerSlot.x,
        y: FOOTER_TOP_MM,
      };
    }

    const lastSameField = sameFieldSchemas.sort((left, right) => {
      return left.position.y - right.position.y;
    })[sameFieldSchemas.length - 1];

    return {
      x: footerSlot.x,
      y: Math.min(
        lastSameField.position.y + lastSameField.height + FOOTER_ROW_GAP_MM,
        PAGE_HEIGHT_MM - PAGE_PADDING_MM - dimensions.height
      ),
    };
  }

  const footerSchemas = [...page]
    .filter((schema) => schema.position.y >= FOOTER_TOP_MM - 2)
    .sort((left, right) => {
      if (left.position.y === right.position.y) {
        return left.position.x - right.position.x;
      }

      return left.position.y - right.position.y;
    });

  if (footerSchemas.length === 0) {
    return {
      x: PAGE_PADDING_MM,
      y: FOOTER_TOP_MM,
    };
  }

  const currentRowY = footerSchemas[footerSchemas.length - 1].position.y;
  const currentRowSchemas = footerSchemas.filter(
    (schema) => Math.abs(schema.position.y - currentRowY) < 1
  );
  const lastSchemaInRow = currentRowSchemas[currentRowSchemas.length - 1];
  const nextX =
    lastSchemaInRow.position.x +
    lastSchemaInRow.width +
    FOOTER_COLUMN_GAP_MM;

  if (nextX + dimensions.width <= PAGE_WIDTH_MM - PAGE_PADDING_MM) {
    return {
      x: nextX,
      y: currentRowY,
    };
  }

  const rowBottom = Math.max(
    ...currentRowSchemas.map((schema) => schema.position.y + schema.height)
  );

  return {
    x: PAGE_PADDING_MM,
    y: Math.min(
      rowBottom + FOOTER_ROW_GAP_MM,
      PAGE_HEIGHT_MM - PAGE_PADDING_MM - dimensions.height
    ),
  };
}

export function insertFieldIntoTemplate(args: {
  template: Template;
  field: PdfTemplateFieldDefinition;
  pageIndex: number;
  position?: Position;
}): Template {
  const sanitizedSchemas = args.template.schemas.map((page, index) =>
    sanitizePage(page, index)
  );
  const pageIndex = Math.min(
    Math.max(args.pageIndex, 0),
    Math.max(sanitizedSchemas.length - 1, 0)
  );
  const nextTemplate: Template = {
    ...args.template,
    schemas: sanitizedSchemas.map((page, index) =>
      index === pageIndex ? [...page] : page
    ),
  };
  const page = nextTemplate.schemas[pageIndex] ?? [];
  const dimensions = getFieldDimensions(args.field);
  const position = args.position
    ? clampPosition(args.position, dimensions)
    : isFooterField(args.field)
      ? getNextFooterPosition(page, args.field, dimensions)
      : getNextBodyPosition(page);

  const nextSchema: TemplateSchema = {
    id: generateSchemaId(),
    name: args.field.key,
    type: isImageField(args.field) ? 'image' : 'text',
    position,
    width: dimensions.width,
    height: dimensions.height,
    readOnly: true,
    content: `{${args.field.key}}`,
    ...(isImageField(args.field) ? {} : { fontSize: dimensions.fontSize }),
  };

  if (isImageField(args.field)) {
    nextSchema.content = TRANSPARENT_IMAGE_PLACEHOLDER;
  }

  page.push(nextSchema);

  nextTemplate.schemas[pageIndex] = page;

  return nextTemplate;
}

