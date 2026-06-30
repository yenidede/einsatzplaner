import prisma from '@/lib/prisma';
import type {
  DocumentTemplateFieldDefinition,
  DocumentTemplateFieldValue,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import { getDocumentTemplateFieldDefinitions } from './document-template-fields';

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

function formatDate(value: Date | null | undefined) {
  return value ? dateFormatter.format(value) : '—';
}

function formatTime(value: Date | null | undefined) {
  return value ? `${timeFormatter.format(value)} Uhr` : '—';
}

function formatCurrency(value: number | null | undefined) {
  return typeof value === 'number' ? currencyFormatter.format(value) : '—';
}

function joinText(values: Array<string | null | undefined>) {
  const parts = values.filter((value): value is string =>
    Boolean(value?.trim())
  );
  return parts.length > 0 ? parts.join(', ') : '—';
}

function formatPerson(
  value:
    | { firstname: string | null; lastname: string | null }
    | null
    | undefined
) {
  if (!value) {
    return '—';
  }

  return joinText([value.firstname, value.lastname]).replace(', ', ' ');
}

function parseStringArray(value: string | null | undefined): string[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const strings = parsed.filter(
        (entry): entry is string => typeof entry === 'string'
      );
      return strings.length > 0 ? strings : null;
    }
  } catch {
    return null;
  }

  return null;
}

function formatCustomValue(args: {
  value: string | null;
  datatype: string | null;
  allowedValues: string[];
}) {
  const rawValue = args.value;

  if (!rawValue) {
    return '—';
  }

  switch (args.datatype) {
    case 'boolean':
      return rawValue === 'true' || rawValue === '1' || rawValue === 'Ja'
        ? 'Ja'
        : 'Nein';
    case 'date': {
      const date = new Date(rawValue);
      return Number.isNaN(date.getTime()) ? rawValue : formatDate(date);
    }
    case 'time':
      return rawValue.includes(':') ? `${rawValue.slice(0, 5)} Uhr` : rawValue;
    case 'currency': {
      const numericValue = Number(rawValue.replace(',', '.'));
      return Number.isNaN(numericValue)
        ? rawValue
        : currencyFormatter.format(numericValue);
    }
    case 'number':
      return rawValue;
    case 'select':
      return args.allowedValues.find((value) => value === rawValue) ?? rawValue;
    default: {
      const values = parseStringArray(rawValue);
      return values ? values.join(', ') : rawValue;
    }
  }
}

function resolveDuration(start: Date, end: Date) {
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );
  if (minutes === 0) {
    return '—';
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours > 0 && rest > 0) {
    return `${hours} Std. ${rest} Min.`;
  }

  if (hours > 0) {
    return `${hours} Std.`;
  }

  return `${rest} Min.`;
}

function createResolvedField(
  definition: DocumentTemplateFieldDefinition,
  rawValue: DocumentTemplateFieldValue,
  formattedValue: string
) {
  return {
    definition,
    rawValue,
    formattedValue: formattedValue.trim() ? formattedValue : '—',
  };
}

export async function resolveDocumentTemplateFields(args: {
  organizationId: string;
  einsatzId?: string | null;
}): Promise<ResolvedDocumentTemplateFields> {
  const definitions = await getDocumentTemplateFieldDefinitions(
    args.organizationId
  );

  if (!args.einsatzId) {
    return Object.fromEntries(
      definitions.map((definition) => [
        definition.key,
        createResolvedField(definition, null, sampleValueForField(definition)),
      ])
    );
  }

  const einsatz = await prisma.einsatz.findFirst({
    where: {
      id: args.einsatzId,
      org_id: args.organizationId,
    },
    include: {
      organization: {
        include: {
          organization_address: {
            orderBy: { created_at: 'asc' },
            take: 1,
          },
        },
      },
      user: {
        select: {
          firstname: true,
          lastname: true,
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
            include: {
              type: {
                select: {
                  datatype: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!einsatz) {
    return Object.fromEntries(
      definitions.map((definition) => [
        definition.key,
        createResolvedField(definition, null, '—'),
      ])
    );
  }

  const helperNames = einsatz.einsatz_helper.map((helper) =>
    formatPerson(helper.user)
  );
  const categories = einsatz.einsatz_to_category.map(
    (entry) => entry.einsatz_category.value
  );
  const contactPerson = findLikelyFieldValue(einsatz.einsatz_field, [
    'kontaktperson',
    'ansprechperson',
    'kontakt',
  ]);
  const contactPhone = findLikelyFieldValue(einsatz.einsatz_field, [
    'telefon',
    'phone',
  ]);
  const contactEmail = findLikelyFieldValue(einsatz.einsatz_field, [
    'e-mail',
    'email',
    'mail',
  ]);
  const organizationAddress = einsatz.organization.organization_address
    .map((address) =>
      [
        address.street,
        [address.postal_code, address.city].filter(Boolean).join(' '),
        address.country,
      ]
        .filter(Boolean)
        .join(', ')
    )
    .at(0);
  const customValuesByFieldId = new Map(
    einsatz.einsatz_field.map((fieldValue) => [
      fieldValue.field_id,
      formatCustomValue({
        value: fieldValue.value,
        datatype: fieldValue.field.type?.datatype ?? null,
        allowedValues: fieldValue.field.allowed_values,
      }),
    ])
  );

  return Object.fromEntries(
    definitions.map((definition) => {
      const standardValue = resolveStandardFieldValue(definition.key, {
        assignmentName: einsatz.title,
        assignmentDate: formatDate(einsatz.start),
        assignmentStartTime: formatTime(einsatz.start),
        assignmentEndTime: formatTime(einsatz.end),
        assignmentDuration: resolveDuration(einsatz.start, einsatz.end),
        assignmentStatus: einsatz.einsatz_status.verwalter_text,
        contactPerson: contactPerson ?? formatPerson(einsatz.user),
        contactPhone: contactPhone ?? einsatz.organization.phone ?? '—',
        contactEmail: contactEmail ?? einsatz.organization.email ?? '—',
        organizationName: einsatz.organization.name,
        programName: einsatz.einsatz_template?.name ?? '—',
        categories: joinText(categories),
        location:
          findLikelyFieldValue(einsatz.einsatz_field, ['ort', 'location']) ??
          '—',
        participantCount:
          typeof einsatz.participant_count === 'number'
            ? String(einsatz.participant_count)
            : '—',
        pricePerPerson: formatCurrency(einsatz.price_per_person),
        totalPrice: formatCurrency(einsatz.total_price),
        note: einsatz.anmerkung ?? '—',
        guides: helperNames.join(', ') || '—',
        helpers: helperNames.join(', ') || '—',
        responsiblePerson: formatPerson(einsatz.user),
        administrationName: '—',
        administrationFunction: '—',
        organizationLogoUrl: einsatz.organization.logo_url ?? '—',
        organizationEmail: einsatz.organization.email ?? '—',
        organizationPhone: einsatz.organization.phone ?? '—',
        organizationAddress: organizationAddress ?? '—',
        pageNumber: '{{pageNumber}}',
      });

      const customValue =
        definition.sourceFieldId &&
        customValuesByFieldId.get(definition.sourceFieldId);
      const formattedValue = customValue ?? standardValue ?? '—';

      return [
        definition.key,
        createResolvedField(definition, formattedValue, formattedValue),
      ];
    })
  );
}

function sampleValueForField(definition: DocumentTemplateFieldDefinition) {
  if (definition.key === 'pageNumber') {
    return '1';
  }

  if (definition.key === 'organizationLogoUrl') {
    return '—';
  }

  switch (definition.dataType) {
    case 'date':
      return '16.06.2026';
    case 'time':
      return '10:00 Uhr';
    case 'currency':
      return '12,50 €';
    case 'boolean':
      return 'Ja';
    case 'number':
      return '20';
    case 'email':
      return 'office@example.org';
    case 'phone':
      return '+43 1 234567';
    case 'list':
      return 'Maria Muster, Max Beispiel';
    case 'person':
      return 'Maria Muster';
    default:
      return definition.source === 'custom_field'
        ? `Beispielwert ${definition.label}`
        : definition.label;
  }
}

function resolveStandardFieldValue(
  key: string,
  values: Record<string, string>
) {
  return values[key] ?? null;
}

function findLikelyFieldValue(
  fields: Array<{
    value: string | null;
    field: {
      name: string | null;
    };
  }>,
  needles: string[]
) {
  const matchingField = fields.find((field) => {
    const name = field.field.name?.toLowerCase() ?? '';
    return needles.some((needle) => name.includes(needle));
  });

  return matchingField?.value ?? null;
}
