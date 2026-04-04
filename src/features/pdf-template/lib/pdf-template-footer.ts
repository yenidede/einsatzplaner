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
export const FOOTER_ZONE_ORDER = ['left', 'center', 'right'] as const;
export type PdfFooterZone = (typeof FOOTER_ZONE_ORDER)[number];
export const FOOTER_CONTENT_MAX_WIDTH_MM =
  PDF_PAGE_WIDTH_MM - PDF_PAGE_PADDING_MM * 2;
export const FOOTER_ZONE_MAX_LINES = 2;
export const FOOTER_BOTTOM_PADDING_MM = 8;

const FOOTER_MIN_TOP_MM = PDF_PAGE_PADDING_MM;
const FOOTER_COLUMN_GAP_MM = 6;
const FOOTER_ROW_GAP_MM = 2.4;
const FOOTER_DIVIDER_GAP_MM = 3;
const FOOTER_DIVIDER_HEIGHT_MM = 2;
const FOOTER_CONTAINER_PADDING_TOP_MM = 1.8;
const FOOTER_CONTAINER_PADDING_BOTTOM_MM = 1.8;
const FOOTER_MIN_TEXT_HEIGHT_MM = 3.6;
const FOOTER_TEXT_CHARS_PER_LINE_FACTOR = 5;
const FOOTER_TEXT_HEIGHT_FACTOR = 0.34;
const FOOTER_TEXT_HEIGHT_PADDING_MM = 0.8;

interface FooterContentLayout {
  id: string;
  zone: PdfFooterZone;
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
  contentTopY: number;
  contentBottomY: number;
  containerX: number;
  containerWidth: number;
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
  if (value === 'center' || value === 'right') {
    return value;
  }

  return 'left';
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
  if (
    value === 'dot' ||
    value === 'dash' ||
    value === 'slash' ||
    value === 'pipe' ||
    value === 'comma' ||
    value === 'none' ||
    value === 'line_break'
  ) {
    return value;
  }

  return 'pipe';
}

function normalizeColumn(value: unknown): PdfTemplateFooterColumn {
  if (value === 'center' || value === 'right') {
    return value;
  }

  return 'left';
}

function separatorToGlyph(separator: PdfTemplateFooterSeparator): string {
  switch (separator) {
    case 'dot':
      return '\u00b7';
    case 'comma':
      return ',';
    case 'none':
      return '';
    case 'line_break':
      return '\n';
    case 'dash':
      return '-';
    case 'slash':
      return '/';
    case 'pipe':
    default:
      return '|';
  }
}

function separatorToJoinValue(separator: PdfTemplateFooterSeparator): string {
  if (separator === 'line_break') {
    return '\n';
  }

  if (separator === 'none') {
    return '';
  }

  return ` ${separatorToGlyph(separator)} `;
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
    createFooterRow(['{organisation_name}', '{organisation_adressen}'], 'left', 'line_break'),
    createFooterRow(['{organisation_website}'], 'center'),
    createFooterRow(
      ['{organisation_email}', '{organisation_telefon}'],
      'right',
      'dot'
    ),
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

  const separators = ['|', '\u00b7', '\u2022', ',', '-', '/'];
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
    .filter((row) => row.column === 'left' || row.column === 'center')
    .map((row) =>
      row.segments
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join(separatorToJoinValue(row.separator))
    )
    .filter(Boolean);
  const rightLines = rows
    .filter((row) => row.column === 'right')
    .map((row) =>
      row.segments
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join(separatorToJoinValue(row.separator))
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
  return row.segments
    .map((segment) => resolveFooterText(segment.text, input).trim())
    .filter(Boolean)
    .join(separatorToJoinValue(row.separator));
}

function buildContactLineRowId(rows: PdfTemplateFooterRow[]): string {
  const segmentIds = rows.flatMap((row) => row.segments.map((segment) => segment.id));

  if (segmentIds.length > 0) {
    return `contact-line-${segmentIds.join('-')}`;
  }

  return rows[0]?.id ? `${rows[0].id}-contact-line` : 'contact-line';
}

function normalizeRowsForDocumentFooter(
  footer: PdfTemplateFooterConfig
): PdfTemplateFooterRow[] {
  const rows =
    footer.rows.length > 0 ? footer.rows : createDefaultRows();

  if (footer.layout === 'contact_line') {
    const targetColumn: PdfTemplateFooterColumn =
      footer.alignment === 'center'
        ? 'center'
        : footer.alignment === 'right'
          ? 'right'
          : 'left';

    return [
      {
        id: buildContactLineRowId(rows),
        separator: rows[0]?.separator ?? 'pipe',
        column: targetColumn,
        segments: rows.flatMap((row) => row.segments),
      },
    ];
  }

  if (
    footer.layout === 'single_column' &&
    rows.every((row) => row.column === 'left')
  ) {
    const targetColumn: PdfTemplateFooterColumn =
      footer.alignment === 'center'
        ? 'center'
        : footer.alignment === 'right'
          ? 'right'
          : 'left';

    return rows.map((row) => ({ ...row, column: targetColumn }));
  }

  return rows;
}

function getZoneAlignment(zone: PdfFooterZone): PdfTemplateFooterAlignment {
  if (zone === 'center') {
    return 'center';
  }

  if (zone === 'right') {
    return 'right';
  }

  return 'left';
}

function buildZoneItems(args: {
  rows: PdfTemplateFooterRow[];
  zone: PdfFooterZone;
  x: number;
  width: number;
  fontSize: number;
  lineHeight: number;
  input?: PdfTemplateInput;
}): { items: Omit<FooterContentLayout, 'y'>[]; height: number } {
  const { rows, zone, x, width, fontSize, lineHeight, input } = args;
  const limitedRows = rows.slice(0, FOOTER_ZONE_MAX_LINES);
  const alignment = getZoneAlignment(zone);
  const items = limitedRows
    .map((row) => {
      const text = rowToText(row, input);
      if (!text) {
        return null;
      }

      const height = estimateTextHeight(text, width, fontSize, lineHeight);
      return {
        id: row.id,
        zone,
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
  return (
    PDF_PAGE_HEIGHT_MM - FOOTER_BOTTOM_SAFE_AREA_MM - FOOTER_BOTTOM_PADDING_MM
  );
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
    showDivider: true,
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
    showDivider: value.showDivider !== false,
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
  const rows = normalizeRowsForDocumentFooter(footer);
  const fontSize = clampNumber(footer.fontSize, 6, 10);
  const lineHeight = clampNumber(footer.lineHeight, 1, 1.35);
  const containerX = PDF_PAGE_PADDING_MM;
  const hasCenterRows = rows.some((row) => row.column === 'center');
  const hasRightRows = rows.some((row) => row.column === 'right');
  const useSingleColumn = !hasCenterRows && !hasRightRows;

  const zones = useSingleColumn
    ? [
        buildZoneItems({
          rows: rows.filter((row) => row.column === 'left'),
          zone: 'left',
          x: containerX,
          width: FOOTER_CONTENT_MAX_WIDTH_MM,
          fontSize,
          lineHeight,
          input,
        }),
      ]
    : (() => {
        const zoneWidth =
          (FOOTER_CONTENT_MAX_WIDTH_MM - FOOTER_COLUMN_GAP_MM * 2) / 3;

        return FOOTER_ZONE_ORDER.map((zone, index) =>
          buildZoneItems({
            rows: rows.filter((row) => row.column === zone),
            zone,
            x: containerX + index * (zoneWidth + FOOTER_COLUMN_GAP_MM),
            width: zoneWidth,
            fontSize,
            lineHeight,
            input,
          })
        );
      })();

  const contentHeight = Math.max(
    FOOTER_MIN_TEXT_HEIGHT_MM,
    ...zones.map((zone) => zone.height)
  );
  const containerHeight =
    FOOTER_CONTAINER_PADDING_TOP_MM +
    contentHeight +
    FOOTER_CONTAINER_PADDING_BOTTOM_MM;
  const topY = getFooterTopY(containerHeight, footer.topSpacing);
  const contentTopY = topY + FOOTER_CONTAINER_PADDING_TOP_MM;
  const contentBottomY = contentTopY + contentHeight;

  const items = zones.flatMap((zone) => {
    let cursor = contentTopY;
    return zone.items.map((item) => {
      const positioned: FooterContentLayout = {
        ...item,
        y: cursor,
      };
      cursor += item.height + FOOTER_ROW_GAP_MM;
      return positioned;
    });
  });

  return {
    pageIndex: footer.pageIndex,
    topY,
    bottomY: topY + containerHeight,
    contentTopY,
    contentBottomY,
    containerX,
    containerWidth: FOOTER_CONTENT_MAX_WIDTH_MM,
    items,
    showDivider: true,
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
            x: layout.containerX,
            y: layout.topY - (FOOTER_DIVIDER_HEIGHT_MM + FOOTER_DIVIDER_GAP_MM),
          },
          width: layout.containerWidth,
          height: FOOTER_DIVIDER_HEIGHT_MM,
          fontSize: 6,
          fontColor: '#94a3b8',
          content: buildDividerText(layout.containerWidth),
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
    alignment: item.alignment,
    fontColor: '#64748b',
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
