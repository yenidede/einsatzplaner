import type { Template } from '@pdfme/common';
import type { pdfTemplate } from '@/generated/prisma';

export const PDF_TEMPLATE_DOCUMENT_TYPE = 'BOOKING_CONFIRMATION';

export type PdfTemplateDocumentType = typeof PDF_TEMPLATE_DOCUMENT_TYPE;

export type PdfTemplateFooterPreset =
  | 'contact_line'
  | 'multiline'
  | 'divider';

export type PdfTemplateFooterContentType =
  | 'bound_field'
  | 'static_text'
  | 'mixed_text';

export type PdfTemplateFooterAlignment = 'left' | 'center';
export type PdfTemplateFooterLayout =
  | 'single_column'
  | 'two_column'
  | 'contact_line';
export type PdfTemplateFooterSeparator = 'pipe' | 'dot' | 'dash' | 'slash';
export type PdfTemplateFooterColumn = 'left' | 'right';

export type PdfTemplateFooterRepeatMode =
  | 'disabled'
  | 'first_page_only'
  | 'all_pages';

export type PdfTemplateFooterPageScope = 'current_page';

export interface PdfTemplateFooterBlock {
  id: string;
  preset: PdfTemplateFooterPreset;
  contentType: PdfTemplateFooterContentType;
  fieldKey: string | null;
  text: string | null;
  alignment?: PdfTemplateFooterAlignment | null;
  fontSize?: number | null;
  lineHeight?: number | null;
}

export interface PdfTemplateFooterConfig {
  enabled: boolean;
  pageIndex: number;
  pageScope: PdfTemplateFooterPageScope;
  repeatMode: PdfTemplateFooterRepeatMode;
  layout: PdfTemplateFooterLayout;
  topSpacing: number;
  showDivider: boolean;
  alignment: PdfTemplateFooterAlignment;
  fontSize: number;
  lineHeight: number;
  rows: PdfTemplateFooterRow[];
  content: string;
  secondaryContent: string | null;
  blocks?: PdfTemplateFooterBlock[];
}

export interface PdfTemplateFooterSegment {
  id: string;
  text: string;
}

export interface PdfTemplateFooterRow {
  id: string;
  separator: PdfTemplateFooterSeparator;
  column: PdfTemplateFooterColumn;
  segments: PdfTemplateFooterSegment[];
}

export type PdfTemplateFieldValue =
  | string
  | number
  | boolean
  | null
  | string[][]
  | string;

export type PdfTemplateInput = Record<string, PdfTemplateFieldValue>;

export type PdfTemplateFieldGroup =
  | 'organization'
  | 'einsatz'
  | 'contact_person'
  | 'participants'
  | 'custom';

export type PdfTemplateFieldKind = 'standard' | 'custom';

export interface PdfTemplateFieldDefinition {
  key: string;
  label: string;
  source:
    | 'einsatz'
    | 'organization'
    | 'dynamic_field'
    | 'user_property'
    | 'system';
  group: PdfTemplateFieldGroup;
  subgroup?: string | null;
  kind: PdfTemplateFieldKind;
  isCustom: boolean;
  sourceFieldId?: string | null;
  sourceLabel?: string | null;
  searchText: string;
}

export interface StoredPdfTemplateMeta {
  isDefault?: boolean;
  version?: number;
  sampleEinsatzId?: string | null;
  footer?: PdfTemplateFooterConfig | null;
}

export interface StoredPdfTemplateDocument {
  template: Template;
  meta?: StoredPdfTemplateMeta;
}

export interface PdfTemplateListItem {
  id: string;
  organizationId: string;
  name: string;
  documentType: string;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PdfTemplateRecord extends PdfTemplateListItem {
  template: Template;
  sampleEinsatzId: string | null;
  footer: PdfTemplateFooterConfig | null;
}

export type PrismaPdfTemplate = pdfTemplate;
