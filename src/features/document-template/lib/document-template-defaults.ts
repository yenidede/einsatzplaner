import type {
  DocumentTemplateBlock,
  DocumentTemplateContent,
  DocumentTemplatePageSettings,
  DocumentTemplateRichTextNode,
} from '@/features/document-template/types';
import { DOCUMENT_TEMPLATE_CONTENT_KIND } from '@/features/document-template/types';

function createBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function richTextParagraph(
  content: DocumentTemplateRichTextNode[],
  textAlign: 'left' | 'center' | 'right' = 'left'
): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign, spacingBottom: 0 },
        content,
      },
    ],
  };
}

function dynamicField(
  fieldKey: string,
  label: string
): DocumentTemplateRichTextNode {
  return {
    type: 'dynamicField',
    attrs: { fieldKey, label },
  };
}

export function createDocumentTemplateBlock(
  type: DocumentTemplateBlock['type']
): DocumentTemplateBlock {
  switch (type) {
    case 'heading':
      return {
        id: createBlockId(type),
        type,
        text: 'Buchungsbestätigung',
      };
    case 'infoBox':
      return {
        id: createBlockId(type),
        type,
        title: 'Information',
        text: 'Datum: {{assignmentDate}}\nZeit: {{assignmentStartTime}} bis {{assignmentEndTime}}',
      };
    case 'dataTable':
      return {
        id: createBlockId(type),
        type,
        title: 'Übersicht',
        rows: [
          {
            id: createBlockId('row'),
            label: 'Führungsprogramm',
            value: '{{programName}}',
          },
          {
            id: createBlockId('row'),
            label: 'Teilnehmeranzahl',
            value: '{{participantCount}}',
          },
        ],
      };
    case 'divider':
      return { id: createBlockId(type), type };
    case 'signature':
      return {
        id: createBlockId(type),
        type,
        text: 'Mit herzlichem Gruß\n{{administrationName}}\n{{administrationFunction}}',
      };
    case 'field':
      return {
        id: createBlockId(type),
        type,
        fieldKey: 'assignmentName',
      };
    case 'pageBreak':
      return { id: createBlockId(type), type };
    case 'header':
      return {
        id: createBlockId(type),
        type,
        text: '{{organizationName}}',
      };
    case 'footer':
      return {
        id: createBlockId(type),
        type,
        text: '{{organizationEmail}} · {{organizationPhone}}',
      };
    case 'image':
      return {
        id: createBlockId(type),
        type,
        title: 'Logo',
        imageUrl: '{{organizationLogoUrl}}',
      };
    case 'paragraph':
    default:
      return {
        id: createBlockId('paragraph'),
        type: 'paragraph',
        text: 'Sehr geehrte Damen und Herren,\n\nwir bestätigen hiermit den Einsatz „{{assignmentName}}“ am {{assignmentDate}}.',
      };
  }
}

export function createDefaultDocumentTemplatePageSettings(): DocumentTemplatePageSettings {
  return {
    format: 'A4',
    orientation: 'portrait',
    margins: {
      top: 18,
      right: 20,
      bottom: 18,
      left: 20,
    },
    header: {
      enabled: true,
      height: 22,
      showOn: 'allPages',
      blocks: [
        {
          id: createBlockId('header-organization'),
          type: 'header',
          text: '{{organizationName}}',
          richText: richTextParagraph([
            dynamicField('organizationName', 'Organisation'),
          ], 'right'),
          align: 'right',
          showOrganizationName: true,
          showContactInfo: false,
          showDivider: true,
        },
      ],
    },
    footer: {
      enabled: true,
      height: 16,
      showOn: 'allPages',
      blocks: [
        {
          id: createBlockId('footer-contact'),
          type: 'footer',
          text: '{{organizationEmail}} · {{organizationPhone}} · Seite {{pageNumber}}',
          richText: richTextParagraph(
            [
              dynamicField('organizationEmail', 'Organisation E-Mail'),
              { type: 'text', text: ' · ' },
              dynamicField('organizationPhone', 'Organisation Telefon'),
              { type: 'text', text: ' · Seite ' },
              dynamicField('pageNumber', 'Seitenzahl'),
            ],
            'center'
          ),
          align: 'center',
          showDivider: true,
          showPageNumber: false,
        },
      ],
    },
  };
}

export function createDefaultDocumentTemplateContent(): DocumentTemplateContent {
  return {
    kind: DOCUMENT_TEMPLATE_CONTENT_KIND,
    version: 1,
    meta: {
      description: '',
      defaultFormat: 'docx',
      isDefault: false,
      sampleEinsatzId: null,
    },
    page: createDefaultDocumentTemplatePageSettings(),
    document: createDefaultDocumentTemplateDocument(),
    blocks: [
      createDocumentTemplateBlock('heading'),
      createDocumentTemplateBlock('paragraph'),
      createDocumentTemplateBlock('infoBox'),
      createDocumentTemplateBlock('signature'),
    ],
  };
}

export function createDefaultDocumentTemplateDocument(): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'left', spacingBottom: 24 },
        content: [{ type: 'text', text: 'Buchungsbestätigung' }],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'left', spacingBottom: 18 },
        content: [
          { type: 'text', text: 'Sehr geehrte/r ' },
          {
            type: 'dynamicField',
            attrs: { fieldKey: 'contactPerson', label: 'Kontaktperson' },
          },
          { type: 'text', text: ',' },
          { type: 'hardBreak' },
          { type: 'hardBreak' },
          {
            type: 'text',
            text: 'vielen Dank für Ihre Buchung. Hiermit bestätigen wir verbindlich Ihre Führung ',
          },
          {
            type: 'dynamicField',
            attrs: { fieldKey: 'programName', label: 'Führungsprogramm' },
          },
          { type: 'text', text: ' am ' },
          {
            type: 'dynamicField',
            attrs: { fieldKey: 'assignmentDate', label: 'Datum' },
          },
          {
            type: 'text',
            text: '. Die wichtigsten Informationen finden Sie unten zusammengefasst.',
          },
        ],
      },
      {
        type: 'infoBox',
        attrs: { spacingTop: 12, spacingBottom: 24 },
        content: [
          {
            type: 'paragraph',
            attrs: { spacingBottom: 8 },
            content: [
              { type: 'text', text: 'Datum: ' },
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'assignmentDate', label: 'Datum' },
              },
              { type: 'hardBreak' },
              { type: 'text', text: 'Uhrzeit: ' },
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'assignmentStartTime', label: 'Beginnzeit' },
              },
              { type: 'text', text: ' bis ' },
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'assignmentEndTime', label: 'Endzeit' },
              },
              { type: 'hardBreak' },
              { type: 'text', text: 'Ort: ' },
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'location', label: 'Ort' },
              },
              { type: 'hardBreak' },
              { type: 'text', text: 'Führungsprogramm: ' },
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'programName', label: 'Führungsprogramm' },
              },
              { type: 'hardBreak' },
              { type: 'text', text: 'Teilnehmer:innenzahl: ' },
              {
                type: 'dynamicField',
                attrs: {
                  fieldKey: 'participantCount',
                  label: 'Teilnehmeranzahl',
                },
              },
              { type: 'hardBreak' },
              { type: 'text', text: 'Gesamtpreis: ' },
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'totalPrice', label: 'Gesamtpreis' },
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'left', spacingBottom: 18 },
        content: [
          {
            type: 'text',
            text: 'Bitte prüfen Sie die Angaben und melden Sie sich bei Rückfragen direkt bei uns.',
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'left', spacingBottom: 24 },
        content: [
          {
            type: 'text',
            text: 'Bitte informieren Sie uns rechtzeitig, falls sich die Teilnehmer:innenzahl oder Ihre Ankunftszeit ändert.',
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'left', spacingTop: 16 },
        content: [
          { type: 'text', text: 'Mit herzlichem Gruß' },
          { type: 'hardBreak' },
          {
            type: 'dynamicField',
            attrs: { fieldKey: 'administrationName', label: 'Verwaltung Name' },
          },
          { type: 'hardBreak' },
          {
            type: 'dynamicField',
            attrs: {
              fieldKey: 'administrationFunction',
              label: 'Verwaltung Funktion',
            },
          },
        ],
      },
    ],
  };
}
