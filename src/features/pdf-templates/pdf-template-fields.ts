'use server';

import prisma from '@/lib/prisma';
import { slugifyPdfFieldKey } from './pdf-template-helpers';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFieldGroup,
} from './types';

function uniqueFieldDefinitions(
  fields: PdfTemplateFieldDefinition[]
): PdfTemplateFieldDefinition[] {
  const seen = new Set<string>();
  return fields.filter((field) => {
    if (seen.has(field.key)) {
      return false;
    }

    seen.add(field.key);
    return true;
  });
}

function buildUniqueKey(
  label: string,
  sourceId: string,
  usedKeys: Set<string>
): string {
  const baseKey = slugifyPdfFieldKey(label, `feld_${sourceId.slice(0, 8)}`);

  if (!usedKeys.has(baseKey)) {
    usedKeys.add(baseKey);
    return baseKey;
  }

  let suffix = 2;
  while (usedKeys.has(`${baseKey}_${suffix}`)) {
    suffix += 1;
  }

  const key = `${baseKey}_${suffix}`;
  usedKeys.add(key);
  return key;
}

function groupLabel(group: PdfTemplateFieldGroup): string {
  switch (group) {
    case 'organization':
      return 'Organisation';
    case 'einsatz':
      return 'Einsatz';
    case 'contact_person':
      return 'Kontaktperson';
    case 'participants':
      return 'Teilnehmer';
    case 'custom':
      return 'Eigene Felder';
  }
}

function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .toLowerCase();
}

function createStandardField(
  key: string,
  label: string,
  group: PdfTemplateFieldGroup,
  extraSearchTerms: string,
  source: 'einsatz' | 'organization'
): PdfTemplateFieldDefinition {
  return {
    key,
    label,
    source,
    group,
    kind: 'standard',
    isCustom: false,
    sourceLabel: null,
    searchText: buildSearchText([
      label,
      key,
      groupLabel(group),
      source === 'organization' ? 'standard organisation organization' : 'standard einsatz',
      extraSearchTerms,
    ]),
  };
}

const baseFieldDefinitions: PdfTemplateFieldDefinition[] = [
  createStandardField(
    'organisation_name',
    'Name',
    'organization',
    'organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_email',
    'E-Mail',
    'organization',
    'mail email organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_telefon',
    'Telefon',
    'organization',
    'phone telephone organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_website',
    'Website',
    'organization',
    'web url organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_uid',
    'UID',
    'organization',
    'steuer steuerid organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_zvr',
    'ZVR',
    'organization',
    'vereinsregister organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_behoerde',
    'Behörde',
    'organization',
    'authority amt organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_logo_url',
    'Logo',
    'organization',
    'bild image url organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_adressen',
    'Adressen',
    'organization',
    'address standort organisation organization',
    'organization'
  ),
  createStandardField(
    'organisation_bankkonten',
    'Bankkonten',
    'organization',
    'bank iban bic organisation organization',
    'organization'
  ),
  createStandardField(
    'einsatz_titel',
    'Titel',
    'einsatz',
    'event title',
    'einsatz'
  ),
  createStandardField(
    'einsatz_start_datum_formatiert',
    'Datum',
    'einsatz',
    'startdatum date termin',
    'einsatz'
  ),
  createStandardField(
    'einsatz_zeitraum_formatiert',
    'Zeitraum',
    'einsatz',
    'dauer time range',
    'einsatz'
  ),
  createStandardField(
    'einsatz_start_uhrzeit',
    'Startzeit',
    'einsatz',
    'beginn uhrzeit time',
    'einsatz'
  ),
  createStandardField(
    'einsatz_ende_uhrzeit',
    'Endzeit',
    'einsatz',
    'ende uhrzeit time',
    'einsatz'
  ),
  createStandardField(
    'einsatz_preis_gesamt_formatiert',
    'Gesamtpreis',
    'einsatz',
    'kosten total',
    'einsatz'
  ),
  createStandardField(
    'einsatz_kategorien',
    'Kategorien',
    'einsatz',
    'categories tags',
    'einsatz'
  ),
  createStandardField(
    'einsatz_status',
    'Status',
    'einsatz',
    'state',
    'einsatz'
  ),
  createStandardField(
    'einsatz_vorlagenname',
    'Vorlagenname',
    'einsatz',
    'template name',
    'einsatz'
  ),
  createStandardField(
    'einsatz_anmerkung',
    'Anmerkung',
    'contact_person',
    'kommentar notiz bemerkung kontakt',
    'einsatz'
  ),
  createStandardField(
    'einsatz_teilnehmer_anzahl',
    'Anzahl',
    'participants',
    'teilnehmer persons participants count',
    'einsatz'
  ),
  createStandardField(
    'einsatz_preis_pro_person_formatiert',
    'Preis pro Person',
    'participants',
    'teilnehmer persons participants kosten',
    'einsatz'
  ),
  createStandardField(
    'einsatz_helfer_benoetigt',
    'Benötigte Helfer',
    'participants',
    'helpers required volunteer',
    'einsatz'
  ),
  createStandardField(
    'einsatz_helfer_zugewiesen',
    'Zugewiesene Helfer',
    'participants',
    'helpers assigned volunteer',
    'einsatz'
  ),
  createStandardField(
    'einsatz_helfer_liste',
    'Helferliste',
    'participants',
    'helpers volunteer list',
    'einsatz'
  ),
  createStandardField(
    'einsatz_helfer_tabelle',
    'Helfertabelle',
    'participants',
    'helpers volunteer table',
    'einsatz'
  ),
];

export async function getPdfTemplateFieldDefinitions(
  organizationId: string
): Promise<PdfTemplateFieldDefinition[]> {
  const [templateFields, userProperties] = await Promise.all([
    prisma.template_field.findMany({
      where: {
        einsatz_template: {
          org_id: organizationId,
        },
      },
      select: {
        id: true,
        field: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        field: {
          name: 'asc',
        },
      },
    }),
    prisma.user_property.findMany({
      where: { org_id: organizationId },
      select: {
        id: true,
        field: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        field: {
          name: 'asc',
        },
      },
    }),
  ]);

  const usedKeys = new Set(baseFieldDefinitions.map((field) => field.key));

  const dynamicFieldDefinitions: PdfTemplateFieldDefinition[] = templateFields
    .filter((field) => field.field.name)
    .map((field) => {
      const label = field.field.name ?? 'Dynamisches Feld';
      const key = buildUniqueKey(label, field.field.id, usedKeys);

      return {
        key,
        label,
        source: 'dynamic_field',
        group: 'custom',
        subgroup: 'Einsatzfelder',
        kind: 'custom',
        isCustom: true,
        sourceLabel: 'Einsatzfeld',
        searchText: buildSearchText([
          label,
          key,
          'eigene felder custom field einsatzfeld',
          groupLabel('custom'),
        ]),
      };
    });

  const userPropertyDefinitions: PdfTemplateFieldDefinition[] = userProperties
    .filter((property) => property.field.name)
    .map((property) => {
      const label = property.field.name ?? 'Personeneigenschaft';
      const key = buildUniqueKey(label, property.field.id, usedKeys);

      return {
        key,
        label,
        source: 'user_property',
        group: 'custom',
        subgroup: 'Teilnehmer-Eigenschaften',
        kind: 'custom',
        isCustom: true,
        sourceLabel: 'Teilnehmer',
        searchText: buildSearchText([
          label,
          key,
          'eigene felder custom field teilnehmer personeneigenschaft user property',
          groupLabel('custom'),
        ]),
      };
    });

  return uniqueFieldDefinitions([
    ...baseFieldDefinitions,
    ...dynamicFieldDefinitions,
    ...userPropertyDefinitions,
  ]);
}
