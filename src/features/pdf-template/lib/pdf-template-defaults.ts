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

  if (!('width' in basePdf) || !('height' in basePdf) || !('padding' in basePdf)) {
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
    schemas: [
      [
        {
          name: 'dokument_titel',
          type: 'text',
          position: { x: 20, y: 18 },
          width: 110,
          height: 12,
          fontSize: 22,
          fontColor: '#0f172a',
          content: 'Buchungsbestätigung',
          readOnly: true,
        },
        {
          name: 'organisation_name',
          type: 'text',
          position: { x: 20, y: 36 },
          width: 90,
          height: 8,
          fontSize: 12,
          content: '{organisation_name}',
          readOnly: true,
        },
        {
          name: 'einsatz_titel_label',
          type: 'text',
          position: { x: 20, y: 60 },
          width: 40,
          height: 8,
          fontSize: 11,
          content: 'Einsatz',
          readOnly: true,
        },
        {
          name: 'einsatz_titel',
          type: 'text',
          position: { x: 65, y: 60 },
          width: 110,
          height: 8,
          fontSize: 11,
          content: '{einsatz_titel}',
          readOnly: true,
        },
        {
          name: 'einsatz_datum_label',
          type: 'text',
          position: { x: 20, y: 72 },
          width: 40,
          height: 8,
          fontSize: 11,
          content: 'Datum',
          readOnly: true,
        },
        {
          name: 'einsatz_datum',
          type: 'text',
          position: { x: 65, y: 72 },
          width: 110,
          height: 8,
          fontSize: 11,
          content: '{einsatz_start_datum_formatiert}',
          readOnly: true,
        },
        {
          name: 'einsatz_zeit_label',
          type: 'text',
          position: { x: 20, y: 84 },
          width: 40,
          height: 8,
          fontSize: 11,
          content: 'Uhrzeit',
          readOnly: true,
        },
        {
          name: 'einsatz_zeit',
          type: 'text',
          position: { x: 65, y: 84 },
          width: 110,
          height: 8,
          fontSize: 11,
          content: '{einsatz_zeitraum_formatiert}',
          readOnly: true,
        },
        {
          name: 'einsatz_preis_label',
          type: 'text',
          position: { x: 20, y: 96 },
          width: 40,
          height: 8,
          fontSize: 11,
          content: 'Preis',
          readOnly: true,
        },
        {
          name: 'einsatz_preis',
          type: 'text',
          position: { x: 65, y: 96 },
          width: 110,
          height: 8,
          fontSize: 11,
          content: '{einsatz_preis_gesamt_formatiert}',
          readOnly: true,
        },
        {
          name: 'hinweis',
          type: 'text',
          position: { x: 20, y: 120 },
          width: 160,
          height: 24,
          fontSize: 10,
          content:
            'Diese Buchungsbestätigung wurde automatisch aus den Einsatzdaten erzeugt.',
          readOnly: true,
        },
      ],
    ],
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
