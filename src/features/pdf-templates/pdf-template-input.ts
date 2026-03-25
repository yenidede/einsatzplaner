'use server';

import prisma from '@/lib/prisma';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { PdfTemplateInput } from './types';
import { getPdfTemplateFieldDefinitions } from './pdf-template-fields';
import { slugifyPdfFieldKey } from './pdf-template-helpers';

const dateFormatter = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('de-AT', {
  hour: '2-digit',
  minute: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
});

function formatCurrency(value: number | null | undefined): string {
  return typeof value === 'number' ? currencyFormatter.format(value) : '';
}

function formatDate(value: Date | null | undefined): string {
  return value ? dateFormatter.format(value) : '';
}

function formatTime(value: Date | null | undefined): string {
  return value ? timeFormatter.format(value) : '';
}

function joinText(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value?.trim())).join(', ');
}

function toStringValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein';
  }

  return String(value);
}

export async function getBookingConfirmationPreviewOptions(
  organizationId: string
): Promise<Array<{ id: string; title: string }>> {
  const { session } = await requireAuth();

  if (!(await hasPermission(session, 'templates:read', organizationId))) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }

  const records = await prisma.einsatz.findMany({
    where: { org_id: organizationId },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      start: 'desc',
    },
    take: 20,
  });

  return records;
}

export async function buildBookingConfirmationPdfInput(
  einsatzId: string
): Promise<PdfTemplateInput> {
  const { session } = await requireAuth();

  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    include: {
      organization: {
        include: {
          organization_address: true,
          organization_bank_account: true,
          organization_details: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      },
      einsatz_template: {
        select: {
          name: true,
        },
      },
      einsatz_status: {
        select: {
          verwalter_text: true,
        },
      },
      einsatz_helper: {
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      einsatz_to_category: {
        include: {
          einsatz_category: {
            select: {
              value: true,
            },
          },
        },
      },
      einsatz_field: {
        include: {
          field: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      einsatz_user_property: {
        include: {
          user_property: {
            include: {
              field: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!einsatz) {
    throw new NotFoundError('Einsatz nicht gefunden');
  }

  if (!(await hasPermission(session, 'einsaetze:read', einsatz.org_id))) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }

  const fieldDefinitions = await getPdfTemplateFieldDefinitions(einsatz.org_id);
  const fieldKeys = new Map(fieldDefinitions.map((field) => [field.label, field.key]));
  const orgDetails = einsatz.organization.organization_details[0] ?? null;

  const helperRows = einsatz.einsatz_helper.map((helper) => [
    joinText([helper.user.firstname, helper.user.lastname]),
    helper.user.email ?? '',
    helper.user.phone ?? '',
  ]);

  const addressRows = einsatz.organization.organization_address.map((address) => [
    address.label ?? '',
    joinText([address.street, `${address.postal_code} ${address.city}`, address.country]),
  ]);

  const bankRows = einsatz.organization.organization_bank_account.map((bank) => [
    bank.bank_name,
    bank.iban,
    bank.bic,
  ]);

  const input: PdfTemplateInput = {
    organisation_name: einsatz.organization.name,
    organisation_email: einsatz.organization.email ?? '',
    organisation_telefon: einsatz.organization.phone ?? '',
    organisation_logo_url: einsatz.organization.logo_url ?? '',
    organisation_website: orgDetails?.website ?? '',
    organisation_uid: orgDetails?.vat ?? '',
    organisation_zvr: orgDetails?.zvr ?? '',
    organisation_behoerde: orgDetails?.authority ?? '',
    organisation_adressen: joinText(
      einsatz.organization.organization_address.map((address) =>
        joinText([
          address.label ?? '',
          address.street,
          `${address.postal_code} ${address.city}`,
          address.country,
        ])
      )
    ),
    organisation_bankkonten: joinText(
      einsatz.organization.organization_bank_account.map((bank) =>
        joinText([bank.bank_name, bank.iban, bank.bic])
      )
    ),
    einsatz_titel: einsatz.title,
    einsatz_start_datum_formatiert: formatDate(einsatz.start),
    einsatz_zeitraum_formatiert: joinText([
      formatTime(einsatz.start),
      formatTime(einsatz.end),
    ]).replace(', ', ' - '),
    einsatz_start_uhrzeit: formatTime(einsatz.start),
    einsatz_ende_uhrzeit: formatTime(einsatz.end),
    einsatz_preis_pro_person_formatiert: formatCurrency(einsatz.price_per_person),
    einsatz_preis_gesamt_formatiert: formatCurrency(einsatz.total_price),
    einsatz_teilnehmer_anzahl:
      typeof einsatz.participant_count === 'number'
        ? einsatz.participant_count
        : '',
    einsatz_helfer_benoetigt: einsatz.helpers_needed,
    einsatz_helfer_zugewiesen: einsatz.einsatz_helper.length,
    einsatz_helfer_liste: joinText(
      einsatz.einsatz_helper.map((helper) =>
        joinText([helper.user.firstname, helper.user.lastname])
      )
    ),
    einsatz_helfer_tabelle: helperRows,
    einsatz_kategorien: joinText(
      einsatz.einsatz_to_category.map((entry) => entry.einsatz_category.value)
    ),
    einsatz_status: einsatz.einsatz_status.verwalter_text,
    einsatz_anmerkung: einsatz.anmerkung ?? '',
    einsatz_vorlagenname: einsatz.einsatz_template?.name ?? '',
    organisation_adressen_tabelle: addressRows,
    organisation_bankkonten_tabelle: bankRows,
  };

  einsatz.einsatz_field.forEach((fieldValue) => {
    const label = fieldValue.field.name ?? '';
    if (!label) {
      return;
    }

    const fallbackKey = slugifyPdfFieldKey(label, `feld_${fieldValue.field.id.slice(0, 8)}`);
    const key = fieldKeys.get(label) ?? fallbackKey;
    input[key] = toStringValue(fieldValue.value);
  });

  einsatz.einsatz_user_property.forEach((property) => {
    const label = property.user_property.field.name ?? '';
    if (!label) {
      return;
    }

    const fallbackKey = slugifyPdfFieldKey(
      label,
      `eigenschaft_${property.user_property.field.id.slice(0, 8)}`
    );
    const key = fieldKeys.get(label) ?? fallbackKey;
    input[key] = property.is_required ? 'Ja' : 'Nein';
  });

  return input;
}

