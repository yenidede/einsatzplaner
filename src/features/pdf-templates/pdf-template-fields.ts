'use server';

import prisma from '@/lib/prisma';
import { slugifyPdfFieldKey } from './pdf-template-helpers';
import type { PdfTemplateFieldDefinition } from './types';

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

const baseFieldDefinitions: PdfTemplateFieldDefinition[] = [
  { key: 'organisation_name', label: 'Organisation Name', source: 'organization' },
  { key: 'organisation_email', label: 'Organisation E-Mail', source: 'organization' },
  { key: 'organisation_telefon', label: 'Organisation Telefon', source: 'organization' },
  { key: 'organisation_logo_url', label: 'Organisation Logo URL', source: 'organization' },
  { key: 'organisation_website', label: 'Organisation Website', source: 'organization' },
  { key: 'organisation_uid', label: 'Organisation UID', source: 'organization' },
  { key: 'organisation_zvr', label: 'Organisation ZVR', source: 'organization' },
  { key: 'organisation_behoerde', label: 'Organisation Behoerde', source: 'organization' },
  { key: 'organisation_adressen', label: 'Organisation Adressen', source: 'organization' },
  { key: 'organisation_bankkonten', label: 'Organisation Bankkonten', source: 'organization' },
  { key: 'einsatz_titel', label: 'Einsatz Titel', source: 'einsatz' },
  { key: 'einsatz_start_datum_formatiert', label: 'Einsatz Datum', source: 'einsatz' },
  { key: 'einsatz_zeitraum_formatiert', label: 'Einsatz Zeitraum', source: 'einsatz' },
  { key: 'einsatz_start_uhrzeit', label: 'Einsatz Startzeit', source: 'einsatz' },
  { key: 'einsatz_ende_uhrzeit', label: 'Einsatz Endzeit', source: 'einsatz' },
  { key: 'einsatz_preis_pro_person_formatiert', label: 'Preis pro Person', source: 'einsatz' },
  { key: 'einsatz_preis_gesamt_formatiert', label: 'Gesamtpreis', source: 'einsatz' },
  { key: 'einsatz_teilnehmer_anzahl', label: 'Teilnehmeranzahl', source: 'einsatz' },
  { key: 'einsatz_helfer_benoetigt', label: 'Benötigte Helfer', source: 'einsatz' },
  { key: 'einsatz_helfer_zugewiesen', label: 'Zugewiesene Helfer', source: 'einsatz' },
  { key: 'einsatz_helfer_liste', label: 'Helferliste', source: 'einsatz' },
  { key: 'einsatz_helfer_tabelle', label: 'Helfertabelle', source: 'einsatz' },
  { key: 'einsatz_kategorien', label: 'Kategorien', source: 'einsatz' },
  { key: 'einsatz_status', label: 'Status', source: 'einsatz' },
  { key: 'einsatz_anmerkung', label: 'Anmerkung', source: 'einsatz' },
  { key: 'einsatz_vorlagenname', label: 'Vorlagenname Einsatz', source: 'einsatz' },
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

  const dynamicFieldDefinitions = templateFields
    .filter((field) => field.field.name)
    .map((field) => ({
      key: buildUniqueKey(field.field.name ?? '', field.field.id, usedKeys),
      label: field.field.name ?? 'Dynamisches Feld',
      source: 'dynamic_field' as const,
    }));

  const userPropertyDefinitions = userProperties
    .filter((property) => property.field.name)
    .map((property) => ({
      key: buildUniqueKey(property.field.name ?? '', property.field.id, usedKeys),
      label: property.field.name ?? 'Personeneigenschaft',
      source: 'user_property' as const,
    }));

  return uniqueFieldDefinitions([
    ...baseFieldDefinitions,
    ...dynamicFieldDefinitions,
    ...userPropertyDefinitions,
  ]);
}

