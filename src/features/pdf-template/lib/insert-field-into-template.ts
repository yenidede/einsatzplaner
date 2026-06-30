import type { Template } from '@pdfme/common';
import type { PdfTemplateFieldDefinition } from '../types';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 20;
const DEFAULT_FIELD_WIDTH_MM = 78;
const DEFAULT_FIELD_HEIGHT_MM = 10;
const DEFAULT_FIELD_FONT_SIZE = 11;
const FOOTER_TOP_MM = 270;
const FOOTER_COLUMN_GAP_MM = 10;
const FOOTER_ROW_GAP_MM = 4;
const BODY_COLUMN_LEFT_X = 20;
const BODY_COLUMN_RIGHT_X = 110;
const BODY_START_Y = 24;
const BODY_ROW_GAP_MM = 6;
const BODY_COLUMN_SWITCH_CUTOFF_Y = 260;
const BODY_COLUMN_TOLERANCE_MM = 12;
const TRANSPARENT_IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aYkAAAAASUVORK5CYII=';
const IMAGE_FIELD_KEYS = new Set(['organisation_logo_url']);
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

interface BodyPlacement {
  pageIndexOffset: number;
  position: Position;
}

interface InsertFieldIntoTemplateResult {
  template: Template;
  pageIndex: number;
}

type TemplateSchema = Template['schemas'][number][number];

let fallbackIdCounter = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function generateSchemaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  fallbackIdCounter += 1;
  return `pdf-field-${Date.now()}-${fallbackIdCounter}-${Math.floor(
    Math.random() * 1000000
  )}`;
}

function isFooterField(field: PdfTemplateFieldDefinition): boolean {
  return FOOTER_FIELD_KEYS.has(field.key);
}

function isImageField(field: PdfTemplateFieldDefinition): boolean {
  return IMAGE_FIELD_KEYS.has(field.key);
}

function isValidSchema(value: unknown): value is TemplateSchema {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.name !== 'string' || !value.name.trim()) {
    return false;
  }

  if (!isRecord(value.position)) {
    return false;
  }

  return (
    parseFiniteNumber(value.position.x) !== null &&
    parseFiniteNumber(value.position.y) !== null &&
    parseFiniteNumber(value.width) !== null &&
    parseFiniteNumber(value.height) !== null
  );
}

function sanitizeSchema(
  schema: TemplateSchema,
  pageIndex: number,
  schemaIndex: number
): TemplateSchema {
  const positionX = parseFiniteNumber(schema.position.x) ?? 0;
  const positionY = parseFiniteNumber(schema.position.y) ?? 0;
  const width = parseFiniteNumber(schema.width) ?? DEFAULT_FIELD_WIDTH_MM;
  const height = parseFiniteNumber(schema.height) ?? DEFAULT_FIELD_HEIGHT_MM;

  return {
    ...schema,
    name: schema.name.trim(),
    position: {
      ...schema.position,
      x: positionX,
      y: positionY,
    },
    width,
    height,
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

function getNextBodyPosition(page: Template['schemas'][number]): BodyPlacement {
  const bodySchemas = page.filter((schema) => schema.position.y < FOOTER_TOP_MM - 2);
  const getColumnNextY = (columnX: number) => {
    const columnSchemas = bodySchemas.filter(
      (schema) => Math.abs(schema.position.x - columnX) <= BODY_COLUMN_TOLERANCE_MM
    );

    if (columnSchemas.length === 0) {
      return BODY_START_Y;
    }

    const maxBottom = Math.max(
      ...columnSchemas.map((schema) => schema.position.y + schema.height)
    );

    return maxBottom + BODY_ROW_GAP_MM;
  };

  const leftNextY = getColumnNextY(BODY_COLUMN_LEFT_X);

  if (leftNextY <= BODY_COLUMN_SWITCH_CUTOFF_Y) {
    return {
      pageIndexOffset: 0,
      position: { x: BODY_COLUMN_LEFT_X, y: leftNextY },
    };
  }

  const rightNextY = getColumnNextY(BODY_COLUMN_RIGHT_X);

  if (rightNextY <= BODY_COLUMN_SWITCH_CUTOFF_Y) {
    return {
      pageIndexOffset: 0,
      position: { x: BODY_COLUMN_RIGHT_X, y: rightNextY },
    };
  }

  return {
    pageIndexOffset: 1,
    position: { x: BODY_COLUMN_LEFT_X, y: BODY_START_Y },
  };
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
}): InsertFieldIntoTemplateResult {
  const sanitizedSchemas = args.template.schemas.map((page, index) =>
    sanitizePage(page, index)
  );
  const requestedPageIndex = Math.min(
    Math.max(args.pageIndex, 0),
    Math.max(sanitizedSchemas.length - 1, 0)
  );
  const initialPage = sanitizedSchemas[requestedPageIndex] ?? [];
  const nextTemplate: Template = {
    ...args.template,
    schemas: sanitizedSchemas.map((page, index) =>
      index === requestedPageIndex ? [...page] : page
    ),
  };
  const dimensions = getFieldDimensions(args.field);
  const bodyPlacement = !args.position && !isFooterField(args.field)
    ? getNextBodyPosition(initialPage)
    : null;
  const pageIndex = bodyPlacement
    ? requestedPageIndex + bodyPlacement.pageIndexOffset
    : requestedPageIndex;

  if (bodyPlacement?.pageIndexOffset) {
    while (nextTemplate.schemas.length <= pageIndex) {
      nextTemplate.schemas.push([]);
    }
  }

  const page = nextTemplate.schemas[pageIndex] ?? [];
  const position = args.position
    ? clampPosition(args.position, dimensions)
      : isFooterField(args.field)
      ? getNextFooterPosition(page, args.field, dimensions)
      : bodyPlacement?.position ?? { x: BODY_COLUMN_LEFT_X, y: BODY_START_Y };

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

  return {
    template: nextTemplate,
    pageIndex,
  };
}

