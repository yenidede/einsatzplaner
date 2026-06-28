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
      enabled: false,
      height: 18,
      showOn: 'allPages',
      blocks: [],
    },
    footer: {
      enabled: false,
      height: 14,
      showOn: 'allPages',
      blocks: [],
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
    blocks: [],
  };
}

export function createDefaultDocumentTemplateDocument(): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  };
}
