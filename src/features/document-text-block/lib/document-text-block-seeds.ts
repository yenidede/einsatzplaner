import type {
  DocumentTemplateFieldDefinition,
  DocumentTemplateRichTextNode,
} from '@/features/document-template/types';

export type DocumentTextBlockSeed = {
  seedKey: string;
  name: string;
  description: string;
  document: DocumentTemplateRichTextNode;
};

function fieldNode(
  fields: Map<string, DocumentTemplateFieldDefinition>,
  fieldKey: string,
  fallbackLabel: string
): DocumentTemplateRichTextNode {
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
): DocumentTemplateRichTextNode {
  return {
    type: 'paragraph',
    content: [
      { type: 'text', text: `${label}: ` },
      fieldNode(fields, fieldKey, fallbackLabel),
    ],
  };
}

function documentWithSection(
  title: string,
  content: DocumentTemplateRichTextNode[]
): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: title }],
      },
      ...content,
    ],
  };
}

export function createInitialDocumentTextBlockSeeds(
  fieldDefinitions: DocumentTemplateFieldDefinition[]
): DocumentTextBlockSeed[] {
  const fields = new Map(fieldDefinitions.map((field) => [field.key, field]));

  return [
    {
      seedKey: 'contact-block',
      name: 'Kontaktblock',
      description: 'Organisation, Ansprechperson und Kontaktdaten',
      document: documentWithSection('Kontakt', [
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
      ]),
    },
    {
      seedKey: 'assignment-block',
      name: 'Einsatz-/Terminblock',
      description: 'Datum, Zeiten, Ort, Kategorie und Status',
      document: documentWithSection('Einsatz / Termin', [
        fieldLine(fields, 'Datum', 'assignmentDate', 'Datum'),
        fieldLine(fields, 'Beginn', 'assignmentStartTime', 'Beginnzeit'),
        fieldLine(fields, 'Ende', 'assignmentEndTime', 'Endzeit'),
        fieldLine(fields, 'Dauer', 'assignmentDuration', 'Dauer'),
        fieldLine(fields, 'Ort', 'location', 'Ort'),
        fieldLine(fields, 'Kategorie', 'categories', 'Kategorien'),
        fieldLine(fields, 'Status', 'assignmentStatus', 'Status'),
      ]),
    },
    {
      seedKey: 'price-block',
      name: 'Preisblock',
      description: 'Teilnehmeranzahl, Einzelpreis und Gesamtpreis',
      document: documentWithSection('Preis', [
        fieldLine(
          fields,
          'Teilnehmeranzahl',
          'participantCount',
          'Teilnehmeranzahl'
        ),
        fieldLine(fields, 'Einzelpreis', 'pricePerPerson', 'Einzelpreis'),
        fieldLine(fields, 'Gesamtpreis', 'totalPrice', 'Gesamtpreis'),
        fieldLine(fields, 'Anmerkung', 'note', 'Anmerkung'),
      ]),
    },
    {
      seedKey: 'staff-block',
      name: 'Personalblock',
      description: 'Zuständige und eingeteilte Personen',
      document: documentWithSection('Personal', [
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
      ]),
    },
  ];
}
