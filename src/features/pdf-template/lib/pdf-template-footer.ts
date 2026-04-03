import type { Template } from '@pdfme/common';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFooterAlignment,
  PdfTemplateFooterColumn,
  PdfTemplateFooterConfig,
  PdfTemplateFooterLayout,
  PdfTemplateFooterRow,
  PdfTemplateFooterSeparator,
  PdfTemplateFooterSegment,
  PdfTemplateInput,
} from '../types';

export const FOOTER_LIBRARY_FIELD_KEY = '__footer_block__';
export const FOOTER_SCHEMA_PREFIX = '__footer__';
export const PDF_PAGE_WIDTH_MM = 210;
export const PDF_PAGE_HEIGHT_MM = 297;
export const PDF_PAGE_PADDING_MM = 20;
export const FOOTER_BOTTOM_SAFE_AREA_MM = 1;

const FOOTER_MAX_WIDTH_MM = PDF_PAGE_WIDTH_MM - PDF_PAGE_PADDING_MM * 2;
const FOOTER_MIN_TOP_MM = PDF_PAGE_PADDING_MM;
const FOOTER_COLUMN_GAP_MM = 8;
const FOOTER_ROW_GAP_MM = 2.4;
const FOOTER_DIVIDER_GAP_MM = 3;
const FOOTER_DIVIDER_HEIGHT_MM = 3;
const FOOTER_MIN_TEXT_HEIGHT_MM = 3.6;
const FOOTER_TEXT_CHARS_PER_LINE_FACTOR = 5;
const FOOTER_TEXT_HEIGHT_FACTOR = 0.34;
const FOOTER_TEXT_HEIGHT_PADDING_MM = 0.8;

interface FooterContentLayout {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  alignment: PdfTemplateFooterAlignment;
}

interface FooterLayout {
  pageIndex: number;
  topY: number;
  bottomY: number;
  items: FooterContentLayout[];
  showDivider: boolean;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeAlignment(value: unknown): PdfTemplateFooterAlignment {
  return value === 'center' ? 'center' : 'left';
}

function normalizeLayout(value: unknown): PdfTemplateFooterLayout {
  if (
    value === 'single_column' ||
    value === 'two_column' ||
    value === 'contact_line'
  ) {
    return value;
  }

  return 'single_column';
}

function normalizeSeparator(value: unknown): PdfTemplateFooterSeparator {
  if (value === 'dot' || value === 'dash' || value === 'slash' || value === 'pipe') {
    return value;
  }

  return 'pipe';
}

function normalizeColumn(value: unknown): PdfTemplateFooterColumn {
  return value === 'right' ? 'right' : 'left';
}

function separatorToGlyph(separator: PdfTemplateFooterSeparator): string {
  const beforeNarrowingSeparator: PdfTemplateFooterSeparator = separator;

  if (separator === 'dot') {
    return '•';
  }

  switch (beforeNarrowingSeparator) {
    case 'dot':
      return '•';
    case 'dash':
      return '-';
    case 'slash':
      return '/';
    case 'pipe':
    default:
      return '|';
  }
}

function normalizeSegment(value: unknown): PdfTemplateFooterSegment | null {
  if (!isRecord(value)) {
    return null;
  }

  const text = typeof value.text === 'string' ? value.text : '';
  if (!text.trim()) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id ? value.id : generateId('segment'),
    text,
  };
}

function createFooterRow(
  segments: string[],
  column: PdfTemplateFooterColumn = 'left',
  separator: PdfTemplateFooterSeparator = 'pipe'
): PdfTemplateFooterRow {
  const normalizedSegments = segments
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      id: generateId('segment'),
      text,
    }));

  return {
    id: generateId('row'),
    separator,
    column,
    segments:
      normalizedSegments.length > 0
        ? normalizedSegments
        : [{ id: generateId('segment'), text: '{organisation_adressen}' }],
  };
}

function createDefaultRows(): PdfTemplateFooterRow[] {
  return [
    createFooterRow(['{organisation_name}', '{organisation_adressen}']),
    createFooterRow(['{organisation_email}', '{organisation_website}', '{organisation_telefon}']),
    createFooterRow(['{organisation_bankkonten}']),
  ];
}

function normalizeRow(value: unknown): PdfTemplateFooterRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const segments = Array.isArray(value.segments)
    ? value.segments.map((segment) => normalizeSegment(segment)).filter((segment): segment is PdfTemplateFooterSegment => Boolean(segment))
    : [];

  if (segments.length === 0) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id ? value.id : generateId('row'),
    separator: normalizeSeparator(value.separator),
    column: normalizeColumn(value.column),
    segments,
  };
}

function legacySegmentsFromBlocks(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.blocks)) {
    return [];
  }

  return value.blocks
    .map((block) => {
      if (!isRecord(block)) {
        return null;
      }

      if (
        block.contentType === 'bound_field' &&
        typeof block.fieldKey === 'string' &&
        block.fieldKey
      ) {
        return `{${block.fieldKey}}`;
      }

      if (typeof block.text === 'string' && block.text.trim()) {
        return block.text.trim();
      }

      if (typeof block.fieldKey === 'string' && block.fieldKey) {
        return `{${block.fieldKey}}`;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function parseLineToSegments(line: string): string[] {
  const normalized = line.trim();
  if (!normalized) {
    return [];
  }

  if (normalized.includes('•')) {
    return normalized
      .split('•')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const separators = ['|', '•', '-', '/'];
  for (const separator of separators) {
    if (normalized.includes(separator)) {
      return normalized
        .split(separator)
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }

  return [normalized];
}

function rowsFromLegacyContent(value: unknown): PdfTemplateFooterRow[] {
  if (!isRecord(value)) {
    return createDefaultRows();
  }

  const content = typeof value.content === 'string' ? value.content : '';
  const secondary = typeof value.secondaryContent === 'string' ? value.secondaryContent : '';
  const legacyBlockSegments = legacySegmentsFromBlocks(value);

  const rows: PdfTemplateFooterRow[] = [];

  const mainLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of mainLines) {
    rows.push(createFooterRow(parseLineToSegments(line), 'left', 'pipe'));
  }

  const secondaryLines = secondary
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of secondaryLines) {
    rows.push(createFooterRow(parseLineToSegments(line), 'right', 'pipe'));
  }

  if (rows.length === 0 && legacyBlockSegments.length > 0) {
    rows.push(createFooterRow(legacyBlockSegments, 'left', 'pipe'));
  }

  return rows.length > 0 ? rows : createDefaultRows();
}

function rowsToLegacyContent(rows: PdfTemplateFooterRow[]): {
  content: string;
  secondaryContent: string | null;
} {
  const leftLines = rows
    .filter((row) => row.column === 'left')
    .map((row) =>
      row.segments
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join(` ${separatorToGlyph(row.separator)} `)
    )
    .filter(Boolean);
  const rightLines = rows
    .filter((row) => row.column === 'right')
    .map((row) =>
      row.segments
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join(` ${separatorToGlyph(row.separator)} `)
    )
    .filter(Boolean);

  return {
    content: leftLines.join('\n'),
    secondaryContent: rightLines.length > 0 ? rightLines.join('\n') : null,
  };
}

function resolveFooterText(text: string, input?: PdfTemplateInput): string {
  return text.replace(/\{([^}]+)\}/g, (match, fieldKey: string) => {
    const value = input?.[fieldKey];

    if (Array.isArray(value)) {
      return value
        .map((row) => row.join(' '))
        .filter(Boolean)
        .join('\n');
    }

    if (typeof value === 'string') {
      return value.trim() || match;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return match;
  });
}

function estimateLineCount(text: string, widthMm: number, fontSize: number): number {
  const normalizedText = text.replace(/\r/g, '');
  const charsPerLine = Math.max(
    28,
    Math.floor((widthMm * FOOTER_TEXT_CHARS_PER_LINE_FACTOR) / Math.max(fontSize, 6))
  );

  return normalizedText.split('\n').reduce((lineCount, line) => {
    const currentLineLength = line.trim().length;

    if (currentLineLength === 0) {
      return lineCount + 1;
    }

    return lineCount + Math.max(1, Math.ceil(currentLineLength / charsPerLine));
  }, 0);
}

function estimateTextHeight(
  text: string,
  widthMm: number,
  fontSize: number,
  lineHeight: number
): number {
  const lineCount = estimateLineCount(text, widthMm, fontSize);
  return Math.max(
    FOOTER_MIN_TEXT_HEIGHT_MM,
    Number(
      (
        lineCount * fontSize * lineHeight * FOOTER_TEXT_HEIGHT_FACTOR +
        FOOTER_TEXT_HEIGHT_PADDING_MM
      ).toFixed(2)
    )
  );
}

function hasFooterContent(footer: PdfTemplateFooterConfig | null): footer is PdfTemplateFooterConfig {
  if (!footer?.enabled) {
    return false;
  }

  return footer.rows.some((row) =>
    row.segments.some((segment) => segment.text.trim().length > 0)
  );
}

function repeatFooterOnPage(
  footer: PdfTemplateFooterConfig,
  pageIndex: number,
  totalPages: number
): boolean {
  if (!footer.enabled) {
    return false;
  }

  if (footer.repeatMode === 'all_pages') {
    return true;
  }

  if (footer.repeatMode === 'first_page_only') {
    return pageIndex === 0;
  }

  return pageIndex === Math.min(footer.pageIndex, Math.max(totalPages - 1, 0));
}

function rowToText(row: PdfTemplateFooterRow, input?: PdfTemplateInput): string {
  const separator = ` ${separatorToGlyph(row.separator)} `;
  return row.segments
    .map((segment) => resolveFooterText(segment.text, input).trim())
    .filter(Boolean)
    .join(separator);
}

function buildContactLineRowId(rows: PdfTemplateFooterRow[]): string {
  const segmentIds = rows.flatMap((row) => row.segments.map((segment) => segment.id));

  if (segmentIds.length > 0) {
    return `contact-line-${segmentIds.join('-')}`;
  }

  return rows[0]?.id ? `${rows[0].id}-contact-line` : 'contact-line';
}

function stackRows(
  rows: PdfTemplateFooterRow[],
  x: number,
  width: number,
  fontSize: number,
  lineHeight: number,
  alignment: PdfTemplateFooterAlignment,
  input?: PdfTemplateInput
): { items: Omit<FooterContentLayout, 'y'>[]; height: number } {
  const items = rows
    .map((row) => {
      const text = rowToText(row, input);
      if (!text) {
        return null;
      }

      const height = estimateTextHeight(text, width, fontSize, lineHeight);
      return {
        id: row.id,
        text,
        x,
        width,
        height,
        fontSize,
        lineHeight,
        alignment,
      };
    })
    .filter((item): item is Omit<FooterContentLayout, 'y'> => Boolean(item));

  const height = items.reduce((sum, item, index) => {
    return sum + item.height + (index > 0 ? FOOTER_ROW_GAP_MM : 0);
  }, 0);

  return { items, height };
}

function getFooterBottomLimitMm(): number {
  return PDF_PAGE_HEIGHT_MM - FOOTER_BOTTOM_SAFE_AREA_MM;
}

function getFooterTopY(contentHeight: number, topSpacing: number): number {
  return Math.max(
    FOOTER_MIN_TOP_MM,
    getFooterBottomLimitMm() - contentHeight - topSpacing
  );
}

export function createDefaultFooterConfig(pageIndex = 0): PdfTemplateFooterConfig {
  const rows = createDefaultRows();
  const legacy = rowsToLegacyContent(rows);

  return {
    enabled: true,
    pageIndex,
    pageScope: 'current_page',
    repeatMode: 'disabled',
    layout: 'single_column',
    topSpacing: 2,
    showDivider: false,
    alignment: 'left',
    fontSize: 8,
    lineHeight: 1.15,
    rows,
    content: legacy.content,
    secondaryContent: legacy.secondaryContent,
  };
}

export function normalizeFooterConfig(value: unknown): PdfTemplateFooterConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const normalizedRows = Array.isArray(value.rows)
    ? value.rows
        .map((row) => normalizeRow(row))
        .filter((row): row is PdfTemplateFooterRow => Boolean(row))
    : [];
  const rows = normalizedRows.length > 0 ? normalizedRows : rowsFromLegacyContent(value);
  const legacy = rowsToLegacyContent(rows);

  return {
    enabled: value.enabled !== false,
    pageIndex:
      typeof value.pageIndex === 'number' ? Math.max(0, Math.floor(value.pageIndex)) : 0,
    pageScope: 'current_page',
    repeatMode:
      value.repeatMode === 'first_page_only' || value.repeatMode === 'all_pages'
        ? value.repeatMode
        : 'disabled',
    layout: normalizeLayout(value.layout),
    topSpacing:
      typeof value.topSpacing === 'number'
        ? clampNumber(value.topSpacing, 0, 24)
        : 2,
    showDivider: value.showDivider === true,
    alignment: normalizeAlignment(value.alignment),
    fontSize:
      typeof value.fontSize === 'number' ? clampNumber(value.fontSize, 6, 12) : 8,
    lineHeight:
      typeof value.lineHeight === 'number'
        ? clampNumber(value.lineHeight, 1, 1.6)
        : 1.15,
    rows,
    content: legacy.content,
    secondaryContent: legacy.secondaryContent,
    blocks: Array.isArray(value.blocks) ? value.blocks : undefined,
  };
}

export function buildFooterLayout(
  footer: PdfTemplateFooterConfig,
  input?: PdfTemplateInput
): FooterLayout {
  const fontSize =
    footer.layout === 'contact_line'
      ? clampNumber(footer.fontSize - 0.5, 6, 12)
      : footer.fontSize;
  const lineHeight =
    footer.layout === 'contact_line'
      ? clampNumber(footer.lineHeight, 1, 1.25)
      : footer.lineHeight;
  const baseX =
    footer.alignment === 'center'
      ? (PDF_PAGE_WIDTH_MM - FOOTER_MAX_WIDTH_MM) / 2
      : PDF_PAGE_PADDING_MM;

  if (footer.layout === 'two_column') {
    const leftRows = footer.rows.filter((row) => row.column === 'left');
    const rightRows = footer.rows.filter((row) => row.column === 'right');
    const columnWidth = (FOOTER_MAX_WIDTH_MM - FOOTER_COLUMN_GAP_MM) / 2;

    const left = stackRows(
      leftRows,
      baseX,
      columnWidth,
      fontSize,
      lineHeight,
      'left',
      input
    );
    const right = stackRows(
      rightRows,
      baseX + columnWidth + FOOTER_COLUMN_GAP_MM,
      columnWidth,
      fontSize,
      lineHeight,
      'left',
      input
    );

    const contentHeight = Math.max(left.height, right.height, 5);
    const topY = getFooterTopY(contentHeight, footer.topSpacing);

    const toPositionedItems = (
      columnItems: Omit<FooterContentLayout, 'y'>[]
    ): FooterContentLayout[] => {
      let cursor = topY;
      return columnItems.map((item) => {
        const positioned = { ...item, y: cursor };
        cursor += item.height + FOOTER_ROW_GAP_MM;
        return positioned;
      });
    };

    return {
      pageIndex: footer.pageIndex,
      topY,
      bottomY: getFooterBottomLimitMm(),
      items: [...toPositionedItems(left.items), ...toPositionedItems(right.items)],
      showDivider: footer.showDivider,
    };
  }

  const rowsForSingleColumn =
    footer.layout === 'contact_line'
      ? [
          {
            id: buildContactLineRowId(footer.rows),
            separator: 'pipe' as const,
            column: 'left' as const,
            segments: footer.rows.flatMap((row) => row.segments),
          },
        ]
      : footer.rows.filter((row) => row.column === 'left' || row.column === 'right');

  const stacked = stackRows(
    rowsForSingleColumn,
    baseX,
    FOOTER_MAX_WIDTH_MM,
    fontSize,
    lineHeight,
    footer.alignment,
    input
  );
  const contentHeight = Math.max(stacked.height, 5);
  const topY = getFooterTopY(contentHeight, footer.topSpacing);

  let cursor = topY;
  const items = stacked.items.map((item) => {
    const positioned = { ...item, y: cursor };
    cursor += item.height + FOOTER_ROW_GAP_MM;
    return positioned;
  });

  return {
    pageIndex: footer.pageIndex,
    topY,
    bottomY: getFooterBottomLimitMm(),
    items,
    showDivider: footer.showDivider,
  };
}

function buildDividerText(widthMm: number): string {
  const approxCharacters = Math.max(20, Math.floor(widthMm / 2.2));
  return '-'.repeat(approxCharacters);
}

function isTemplateSchema(
  value: unknown
): value is Template['schemas'][number][number] {
  return typeof value === 'object' && value !== null;
}

function sanitizeTemplate(template: Template): Template {
  return {
    ...template,
    schemas: template.schemas.map((page, pageIndex) =>
      page
        .filter((schema) => isTemplateSchema(schema))
        .map((schema, schemaIndex) => ({
          ...schema,
          id:
            typeof schema.id === 'string' && schema.id
              ? schema.id
              : `${FOOTER_SCHEMA_PREFIX}-base-${pageIndex}-${schemaIndex}-${schema.name}`,
        }))
    ),
  };
}

function buildFooterSchemasForPage(
  footer: PdfTemplateFooterConfig,
  pageIndex: number,
  input?: PdfTemplateInput
): Template['schemas'][number] {
  const layout = buildFooterLayout(
    {
      ...footer,
      pageIndex,
    },
    input
  );

  const dividerSchemas = layout.showDivider
    ? [
        {
          id: `${FOOTER_SCHEMA_PREFIX}-divider-${pageIndex}`,
          name: `${FOOTER_SCHEMA_PREFIX}-divider-${pageIndex}`,
          type: 'text' as const,
          position: {
            x: PDF_PAGE_PADDING_MM,
            y: layout.topY - (FOOTER_DIVIDER_HEIGHT_MM + FOOTER_DIVIDER_GAP_MM),
          },
          width: FOOTER_MAX_WIDTH_MM,
          height: FOOTER_DIVIDER_HEIGHT_MM,
          fontSize: 6,
          fontColor: '#94a3b8',
          content: buildDividerText(FOOTER_MAX_WIDTH_MM),
          readOnly: true,
        },
      ]
    : [];

  const contentSchemas = layout.items.map((item) => ({
    id: `${FOOTER_SCHEMA_PREFIX}-${item.id}-${pageIndex}`,
    name: `${FOOTER_SCHEMA_PREFIX}-${item.id}-${pageIndex}`,
    type: 'text' as const,
    position: {
      x: item.x,
      y: item.y,
    },
    width: item.width,
    height: item.height,
    fontSize: item.fontSize,
    lineHeight: item.lineHeight,
    fontColor: '#475569',
    content: item.text,
    readOnly: true,
  }));

  return [...dividerSchemas, ...contentSchemas];
}

export function isFooterSchemaName(name: string): boolean {
  return name.startsWith(FOOTER_SCHEMA_PREFIX);
}

export function stripFooterSchemas(template: Template): Template {
  return {
    ...template,
    schemas: template.schemas.map((page) =>
      page.filter(
        (schema) =>
          isTemplateSchema(schema) &&
          typeof schema.name === 'string' &&
          !isFooterSchemaName(schema.name)
      )
    ),
  };
}

export function applyFooterToTemplate(args: {
  template: Template;
  footer: PdfTemplateFooterConfig | null;
  input?: PdfTemplateInput;
}): Template {
  const cleanTemplate = sanitizeTemplate(stripFooterSchemas(args.template));

  if (!hasFooterContent(args.footer)) {
    return cleanTemplate;
  }

  const footer = args.footer;

  return {
    ...cleanTemplate,
    schemas: cleanTemplate.schemas.map((page, pageIndex, allPages) => {
      if (!repeatFooterOnPage(footer, pageIndex, allPages.length)) {
        return page;
      }

      return [...page, ...buildFooterSchemasForPage(footer, pageIndex, args.input)];
    }),
  };
}

export function buildFooterLibraryField(): PdfTemplateFieldDefinition {
  return {
    key: FOOTER_LIBRARY_FIELD_KEY,
    label: 'Footer-Bereich',
    source: 'system',
    group: 'custom',
    subgroup: 'Layout',
    kind: 'standard',
    isCustom: false,
    sourceLabel: 'Footer',
    searchText:
      'footer footer-bereich dokumentabschluss kontaktzeile segment separator zeile',
  };
}
