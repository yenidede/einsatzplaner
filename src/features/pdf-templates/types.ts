import type { Template } from '@pdfme/common';
import type { pdfTemplate } from '@/generated/prisma';

export const PDF_TEMPLATE_DOCUMENT_TYPE = 'BOOKING_CONFIRMATION';

export type PdfTemplateDocumentType = typeof PDF_TEMPLATE_DOCUMENT_TYPE;

export type PdfTemplateFieldValue =
  | string
  | number
  | boolean
  | null
  | string[][]
  | string;

export type PdfTemplateInput = Record<string, PdfTemplateFieldValue>;

export interface PdfTemplateFieldDefinition {
  key: string;
  label: string;
  source: 'einsatz' | 'organization' | 'dynamic_field' | 'user_property';
}

export interface StoredPdfTemplateMeta {
  isDefault?: boolean;
  version?: number;
  sampleEinsatzId?: string | null;
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
}

export type PrismaPdfTemplate = pdfTemplate;

