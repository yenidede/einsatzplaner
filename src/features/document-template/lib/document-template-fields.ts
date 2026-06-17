import prisma from '@/lib/prisma';
import type {
  DocumentTemplateFieldDefinition,
  DocumentTemplateFieldGroup,
} from '@/features/document-template/types';

function buildSearchDescription(label: string, group: string) {
  return `${label} (${group})`;
}

function standardField(
  key: string,
  label: string,
  group: DocumentTemplateFieldGroup,
  dataType: DocumentTemplateFieldDefinition['dataType'],
  description: string
): DocumentTemplateFieldDefinition {
  return {
    key,
    label,
    group,
    description,
    source: 'standard',
    dataType,
  };
}

const standardFields: DocumentTemplateFieldDefinition[] = [
  standardField(
    'assignmentName',
    'Einsatzname',
    'general',
    'text',
    'Titel des Einsatzes'
  ),
  standardField(
    'assignmentDate',
    'Datum',
    'general',
    'date',
    'Datum des Einsatzes'
  ),
  standardField(
    'assignmentStartTime',
    'Beginnzeit',
    'general',
    'time',
    'Beginn des Einsatzes'
  ),
  standardField(
    'assignmentEndTime',
    'Endzeit',
    'general',
    'time',
    'Ende des Einsatzes'
  ),
  standardField(
    'assignmentDuration',
    'Dauer',
    'general',
    'text',
    'Dauer des Einsatzes'
  ),
  standardField(
    'assignmentStatus',
    'Status',
    'general',
    'text',
    'Aktueller Status'
  ),
  standardField(
    'contactPerson',
    'Kontaktperson',
    'contact',
    'person',
    'Kontaktperson oder Ansprechperson'
  ),
  standardField(
    'contactPhone',
    'Telefonnummer',
    'contact',
    'phone',
    'Telefonnummer der Organisation oder Kontaktperson'
  ),
  standardField(
    'contactEmail',
    'E-Mail',
    'contact',
    'email',
    'E-Mail-Adresse der Organisation oder Kontaktperson'
  ),
  standardField(
    'organizationName',
    'Organisation / Schule / Gruppe',
    'contact',
    'text',
    'Name der Organisation'
  ),
  standardField(
    'programName',
    'Führungsprogramm',
    'event',
    'text',
    'Ausgeschriebener Name der Vorlage oder Kategorie'
  ),
  standardField(
    'location',
    'Ort',
    'event',
    'text',
    'Ort aus eigenen Feldern oder Organisation'
  ),
  standardField(
    'participantCount',
    'Teilnehmeranzahl',
    'event',
    'number',
    'Anzahl der Teilnehmer:innen'
  ),
  standardField(
    'pricePerPerson',
    'Einzelpreis',
    'event',
    'currency',
    'Preis pro Person'
  ),
  standardField(
    'totalPrice',
    'Gesamtpreis',
    'event',
    'currency',
    'Gesamtpreis'
  ),
  standardField(
    'note',
    'Anmerkung',
    'event',
    'rich_text',
    'Anmerkung zum Einsatz'
  ),
  standardField(
    'guides',
    'Vermittler:innen',
    'staff',
    'list',
    'Zugewiesene Vermittler:innen'
  ),
  standardField(
    'helpers',
    'Helfer:innen',
    'staff',
    'list',
    'Zugewiesene Helfer:innen'
  ),
  standardField(
    'responsiblePerson',
    'Zuständige Person',
    'staff',
    'person',
    'Person, die den Einsatz angelegt hat'
  ),
  standardField(
    'administrationName',
    'Verwaltung Name',
    'administration',
    'text',
    'Empfohlenes DB-Feld; aktuell nicht gespeichert'
  ),
  standardField(
    'administrationFunction',
    'Verwaltung Funktion',
    'administration',
    'text',
    'Empfohlenes DB-Feld; aktuell nicht gespeichert'
  ),
  standardField(
    'organizationLogoUrl',
    'Logo',
    'administration',
    'text',
    'Logo der Organisation'
  ),
  standardField(
    'organizationEmail',
    'Organisation E-Mail',
    'administration',
    'email',
    'E-Mail-Adresse der Organisation'
  ),
  standardField(
    'organizationPhone',
    'Organisation Telefon',
    'administration',
    'phone',
    'Telefonnummer der Organisation'
  ),
  standardField(
    'organizationAddress',
    'Organisation Adresse',
    'administration',
    'text',
    'Adresse der Organisation'
  ),
  standardField(
    'pageNumber',
    'Seitenzahl',
    'administration',
    'number',
    'Aktuelle Seitenzahl im Dokument'
  ),
];

function slugifyFieldKey(label: string, fallback: string) {
  const normalized = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized ? `custom.${normalized}` : `custom.${fallback}`;
}

function mapDatatype(
  datatype: string | null | undefined
): DocumentTemplateFieldDefinition['dataType'] {
  switch (datatype) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    case 'currency':
      return 'currency';
    case 'boolean':
      return 'boolean';
    case 'select':
      return 'select';
    case 'phone':
      return 'phone';
    case 'mail':
      return 'email';
    case 'text':
    default:
      return 'text';
  }
}

export async function getDocumentTemplateFieldDefinitions(
  organizationId: string
): Promise<DocumentTemplateFieldDefinition[]> {
  const templateFields = await prisma.template_field.findMany({
    where: {
      einsatz_template: {
        org_id: organizationId,
      },
    },
    select: {
      field: {
        select: {
          id: true,
          name: true,
          description: true,
          type: {
            select: {
              datatype: true,
            },
          },
        },
      },
    },
    orderBy: {
      field: {
        name: 'asc',
      },
    },
  });

  const uniqueTemplateFields = Array.from(
    new Map(
      templateFields
        .filter((entry) => Boolean(entry.field.name?.trim()))
        .map((entry) => [entry.field.id, entry])
    ).values()
  );
  const usedKeys = new Set(standardFields.map((field) => field.key));
  const customFields = uniqueTemplateFields.map(
    (entry): DocumentTemplateFieldDefinition => {
      const label = entry.field.name ?? 'Eigenes Feld';
      let key = slugifyFieldKey(label, entry.field.id.slice(0, 8));
      if (usedKeys.has(key)) {
        key = `${key}_${entry.field.id.slice(0, 8)}`;
      }
      usedKeys.add(key);

      return {
        key,
        label,
        group: 'custom',
        description:
          entry.field.description ??
          buildSearchDescription(label, 'Eigene Felder'),
        source: 'custom_field',
        sourceFieldId: entry.field.id,
        dataType: mapDatatype(entry.field.type?.datatype),
      };
    }
  );

  return Array.from(
    new Map(
      [...standardFields, ...customFields].map((field) => [
        field.sourceFieldId ?? field.key,
        field,
      ])
    ).values()
  );
}
