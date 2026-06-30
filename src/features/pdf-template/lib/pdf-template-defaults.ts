import { BLANK_PDF, type Plugins, type Template } from '@pdfme/common';
import { barcodes, image, table, text } from '@pdfme/schemas';
import {
  PDF_TEMPLATE_DOCUMENT_TYPE,
  type StoredPdfTemplateDocument,
} from '../types';

export const PDF_TEMPLATE_BLANK_BASE_PDF = {
  width: 210,
  height: 297,
  padding: [10, 10, 0, 10],
} satisfies Template['basePdf'];

export function isLegacyPdfTemplateBlankBasePdf(
  basePdf: Template['basePdf']
): boolean {
  if (basePdf === BLANK_PDF) {
    return true;
  }

  if (typeof basePdf !== 'object' || basePdf === null) {
    return false;
  }

  if (
    !('width' in basePdf) ||
    !('height' in basePdf) ||
    !('padding' in basePdf)
  ) {
    return false;
  }

  return (
    basePdf.width === 210 &&
    basePdf.height === 297 &&
    Array.isArray(basePdf.padding) &&
    basePdf.padding.length === 4 &&
    basePdf.padding[0] === 10 &&
    basePdf.padding[1] === 10 &&
    [0, 3, 10].includes(basePdf.padding[2]) &&
    basePdf.padding[3] === 10
  );
}

export function createDefaultPdfmeTemplate(): Template {
  return {
    basePdf: PDF_TEMPLATE_BLANK_BASE_PDF,
    schemas: [[]],
  };
}

export function createDefaultStoredPdfTemplate(): StoredPdfTemplateDocument {
  return {
    template: createDefaultPdfmeTemplate(),
    meta: {
      isDefault: false,
      version: 1,
      sampleEinsatzId: null,
      footer: null,
    },
  };
}

export function getPdfmePlugins(): Plugins {
  return {
    Text: text,
    Image: image,
    'QR Code': barcodes.qrcode,
    Table: table,
  };
}

export function createPdfTemplateName(): string {
  return `Buchungsbestätigung ${PDF_TEMPLATE_DOCUMENT_TYPE}`;
}
