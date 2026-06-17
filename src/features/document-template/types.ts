import type { pdfTemplate } from '@/generated/prisma';

export const DOCUMENT_TEMPLATE_DOCUMENT_TYPE = 'DOCUMENT_TEMPLATE_V1';
export const DOCUMENT_TEMPLATE_CONTENT_KIND = 'DOCUMENT_TEMPLATE_V1';

export type DocumentTemplateBlockType =
  | 'heading'
  | 'paragraph'
  | 'infoBox'
  | 'dataTable'
  | 'divider'
  | 'image'
  | 'signature'
  | 'field'
  | 'pageBreak'
  | 'header'
  | 'footer';

export type DocumentTemplatePaperFormat = 'A4';
export type DocumentTemplateOrientation = 'portrait' | 'landscape';
export type DocumentTemplatePageAreaShowOn = 'firstPage' | 'allPages';
export type DocumentTemplateHorizontalAlignment = 'left' | 'center' | 'right';
export type DocumentTemplateLogoSource = 'organization' | 'custom';

export type DocumentTemplateFieldGroup =
  | 'general'
  | 'contact'
  | 'event'
  | 'staff'
  | 'administration'
  | 'custom';

export type DocumentTemplateFieldValue =
  | string
  | number
  | boolean
  | null
  | string[];

export interface DocumentTemplateFieldDefinition {
  key: string;
  label: string;
  group: DocumentTemplateFieldGroup;
  description: string;
  source: 'standard' | 'custom_field' | 'preference';
  sourceFieldId?: string;
  dataType:
    | 'text'
    | 'number'
    | 'date'
    | 'time'
    | 'currency'
    | 'boolean'
    | 'select'
    | 'multi_select'
    | 'person'
    | 'list'
    | 'email'
    | 'phone'
    | 'rich_text';
}

export interface DocumentTemplateBlock {
  id: string;
  type: DocumentTemplateBlockType;
  title?: string;
  text?: string;
  fieldKey?: string;
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  spacingTop?: number;
  spacingBottom?: number;
  background?: 'none' | 'muted' | 'accent';
  multiSelectFormat?: 'comma' | 'list' | 'line_break';
  rows?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
  imageUrl?: string;
  altText?: string;
  richText?: DocumentTemplateRichTextNode;
  width?: number;
  height?: number;
  keepAspectRatio?: boolean;
  logoSource?: DocumentTemplateLogoSource;
  showOrganizationName?: boolean;
  showContactInfo?: boolean;
  showDivider?: boolean;
  showPageNumber?: boolean;
}

export interface DocumentTemplatePageArea {
  enabled: boolean;
  height: number;
  showOn: DocumentTemplatePageAreaShowOn;
  blocks: DocumentTemplateBlock[];
}

export interface DocumentTemplatePageSettings {
  format: DocumentTemplatePaperFormat;
  orientation: DocumentTemplateOrientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header: DocumentTemplatePageArea;
  footer: DocumentTemplatePageArea;
}

export interface DocumentTemplateRichTextMark {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
}

export interface DocumentTemplateRichTextNode {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  marks?: DocumentTemplateRichTextMark[];
  content?: DocumentTemplateRichTextNode[];
}

export interface DocumentTemplateContent {
  kind: typeof DOCUMENT_TEMPLATE_CONTENT_KIND;
  version: 1;
  meta: {
    description: string;
    defaultFormat?: 'docx' | 'pdf';
    isDefault: boolean;
    sampleEinsatzId: string | null;
  };
  page: DocumentTemplatePageSettings;
  document?: DocumentTemplateRichTextNode;
  blocks: DocumentTemplateBlock[];
}

export interface DocumentTemplateListItem {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplateRecord extends DocumentTemplateListItem {
  content: DocumentTemplateContent;
}

export interface ResolvedDocumentTemplateField {
  definition: DocumentTemplateFieldDefinition;
  rawValue: DocumentTemplateFieldValue;
  formattedValue: string;
}

export type ResolvedDocumentTemplateFields = Record<
  string,
  ResolvedDocumentTemplateField
>;

export type PrismaDocumentTemplate = pdfTemplate;
