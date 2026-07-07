import type { JSONContent } from '@tiptap/react';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';

function fieldNode(
  fields: Map<string, DocumentTemplateFieldDefinition>,
  fieldKey: string,
  fallbackLabel: string
): JSONContent {
  return {
    type: 'dynamicField',
    attrs: {
      fieldKey,
      label: fields.get(fieldKey)?.label ?? fallbackLabel,
    },
  };
}

function fieldLine(
  fields: Map<string, DocumentTemplateFieldDefinition>,
  label: string,
  fieldKey: string,
  fallbackLabel: string
): JSONContent {
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: `${label}: ` },
      fieldNode(fields, fieldKey, fallbackLabel),
    ],
  };
}

function section(title: string, content: JSONContent[]): JSONContent[] {
  return [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: title }],
    },
    ...content,
  ];
}

export function createPracticalBlockContent(
  kind: string,
  fields: Map<string, DocumentTemplateFieldDefinition>
): JSONContent[] | null {
  switch (kind) {
    case 'spacer':
      return [
        {
          type: 'paragraph',
          attrs: { spacingTop: 20, spacingBottom: 20 },
        },
      ];
    case 'dataOverview':
      return section('Datenübersicht', [
        fieldLine(fields, 'Datum', 'assignmentDate', 'Datum'),
        fieldLine(fields, 'Beginn', 'assignmentStartTime', 'Beginnzeit'),
        fieldLine(fields, 'Ende', 'assignmentEndTime', 'Endzeit'),
        fieldLine(fields, 'Ort', 'location', 'Ort'),
      ]);
    case 'contactBlock':
      return section('Kontakt', [
        fieldLine(
          fields,
          'Organisation / Schule / Gruppe',
          'organizationName',
          'Organisation'
        ),
        fieldLine(fields, 'Ansprechperson', 'contactPerson', 'Ansprechperson'),
        fieldLine(fields, 'E-Mail', 'contactEmail', 'E-Mail'),
        fieldLine(fields, 'Telefon', 'contactPhone', 'Telefon'),
        fieldLine(fields, 'Adresse', 'organizationAddress', 'Adresse'),
      ]);
    case 'assignmentBlock':
      return section('Einsatz / Termin', [
        fieldLine(fields, 'Datum', 'assignmentDate', 'Datum'),
        fieldLine(fields, 'Beginn', 'assignmentStartTime', 'Beginnzeit'),
        fieldLine(fields, 'Ende', 'assignmentEndTime', 'Endzeit'),
        fieldLine(fields, 'Dauer', 'assignmentDuration', 'Dauer'),
        fieldLine(fields, 'Ort', 'location', 'Ort'),
        fieldLine(fields, 'Kategorie', 'categories', 'Kategorien'),
        fieldLine(fields, 'Status', 'assignmentStatus', 'Status'),
      ]);
    case 'priceBlock':
      return section('Preis', [
        fieldLine(
          fields,
          'Teilnehmeranzahl',
          'participantCount',
          'Teilnehmeranzahl'
        ),
        fieldLine(fields, 'Einzelpreis', 'pricePerPerson', 'Einzelpreis'),
        fieldLine(fields, 'Gesamtpreis', 'totalPrice', 'Gesamtpreis'),
        fieldLine(fields, 'Anmerkung', 'note', 'Anmerkung'),
      ]);
    case 'staffBlock':
      return section('Personal', [
        fieldLine(
          fields,
          'Erstellt von',
          'responsiblePerson',
          'Erstellt von'
        ),
        fieldLine(
          fields,
          'Eingeteilte Personen',
          'helpers',
          'Eingeteilte Personen'
        ),
      ]);
    default:
      return null;
  }
}
