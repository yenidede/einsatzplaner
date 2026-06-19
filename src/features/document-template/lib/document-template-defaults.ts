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

function text(value: string): DocumentTemplateRichTextNode {
  return { type: 'text', text: value };
}

function hardBreak(): DocumentTemplateRichTextNode {
  return { type: 'hardBreak' };
}

function paragraph(
  content: DocumentTemplateRichTextNode[],
  attrs: Record<string, string | number | boolean | null> = {
    textAlign: 'left',
    spacingBottom: 14,
  }
): DocumentTemplateRichTextNode {
  return {
    type: 'paragraph',
    attrs,
    content,
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
        title: 'Buchungsdetails',
        text: 'Datum: {{assignmentDate}}\nUhrzeit: {{assignmentStartTime}} bis {{assignmentEndTime}}\nOrt: {{location}}',
      };
    case 'dataTable':
      return {
        id: createBlockId(type),
        type,
        title: 'Übersicht',
        rows: [
          {
            id: createBlockId('row'),
            label: 'Programm / Einsatz',
            value: '{{programName}}',
          },
          {
            id: createBlockId('row'),
            label: 'Teilnehmer:innenzahl',
            value: '{{participantCount}}',
          },
          {
            id: createBlockId('row'),
            label: 'Gesamtpreis',
            value: '{{totalPrice}}',
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
        text: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Buchung. Wir bestätigen hiermit Ihren Termin am {{assignmentDate}}.',
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
      height: 18,
      showOn: 'allPages',
      blocks: [
        {
          id: createBlockId('header-organization'),
          type: 'header',
          text: '{{organizationName}}',
          richText: richTextParagraph(
            [
              dynamicField('organizationName', 'Organisation'),
              text(' · Buchungsbestätigung'),
            ],
            'right'
          ),
          align: 'right',
          showOrganizationName: true,
          showContactInfo: false,
          showDivider: true,
        },
      ],
    },
    footer: {
      enabled: true,
      height: 14,
      showOn: 'allPages',
      blocks: [
        {
          id: createBlockId('footer-contact'),
          type: 'footer',
          text: '{{organizationEmail}} · {{organizationPhone}} · Seite {{pageNumber}}',
          richText: richTextParagraph(
            [
              dynamicField('organizationEmail', 'Organisation E-Mail'),
              text(' · '),
              dynamicField('organizationPhone', 'Organisation Telefon'),
              text(' · Seite '),
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
        attrs: { level: 1, textAlign: 'left', spacingBottom: 18 },
        content: [text('Buchungsbestätigung')],
      },
      paragraph(
        [
          text('Sehr geehrte/r '),
          dynamicField('contactPerson', 'Kontaktperson'),
          text(','),
          hardBreak(),
          hardBreak(),
          text(
            'vielen Dank für Ihre Buchung. Wir bestätigen Ihnen hiermit verbindlich den folgenden Termin:'
          ),
        ],
        { textAlign: 'left', spacingBottom: 16 }
      ),
      {
        type: 'infoBox',
        attrs: { spacingTop: 8, spacingBottom: 20 },
        content: [
          paragraph(
            [
              text('Datum'),
              hardBreak(),
              dynamicField('assignmentDate', 'Datum'),
            ],
            { spacingBottom: 10 }
          ),
          paragraph(
            [
              text('Uhrzeit'),
              hardBreak(),
              dynamicField('assignmentStartTime', 'Beginnzeit'),
              text(' bis '),
              dynamicField('assignmentEndTime', 'Endzeit'),
            ],
            { spacingBottom: 10 }
          ),
          paragraph(
            [text('Ort'), hardBreak(), dynamicField('location', 'Ort')],
            { spacingBottom: 10 }
          ),
          paragraph(
            [
              text('Programm / Einsatz'),
              hardBreak(),
              dynamicField('programName', 'Führungsprogramm'),
            ],
            { spacingBottom: 10 }
          ),
          paragraph(
            [
              text('Teilnehmer:innenzahl'),
              hardBreak(),
              dynamicField('participantCount', 'Teilnehmeranzahl'),
            ],
            { spacingBottom: 10 }
          ),
          paragraph(
            [
              text('Gesamtpreis'),
              hardBreak(),
              dynamicField('totalPrice', 'Gesamtpreis'),
            ],
            { spacingBottom: 0 }
          ),
        ],
      },
      paragraph(
        [
          text(
            'Bitte prüfen Sie die Angaben und melden Sie sich bei Rückfragen oder Änderungen rechtzeitig bei uns.'
          ),
        ],
        { textAlign: 'left', spacingBottom: 14 }
      ),
      paragraph(
        [
          text(
            'Wir freuen uns auf Ihren Besuch und stehen Ihnen für weitere Informationen gerne zur Verfügung.'
          ),
        ],
        { textAlign: 'left', spacingBottom: 22 }
      ),
      paragraph(
        [
          text('Mit herzlichem Gruß'),
          hardBreak(),
          dynamicField('administrationName', 'Verwaltung Name'),
          hardBreak(),
          dynamicField('administrationFunction', 'Verwaltung Funktion'),
        ],
        { textAlign: 'left', spacingTop: 12, spacingBottom: 0 }
      ),
    ],
  };
}
