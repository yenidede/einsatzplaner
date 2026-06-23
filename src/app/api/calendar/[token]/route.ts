import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import ical, { ICalEventStatus, ICalCalendarMethod } from 'ical-generator';
import { ROLE_PERMISSION_MAP } from '@/lib/auth/authGuard';
import { parseCalendarExportConfig } from '@/features/calendar-subscription/config';
import { filterCalendarExportEvents } from '@/features/calendar-subscription/filter';
import {
  composeCalendarExportEventTitle,
  slugifyCalendarExportFilenamePart,
} from '@/features/calendar-subscription/title';

type RouteContext = {
  params: Promise<{ token: string }>;
};

function roleHasPermission(roleName: string, permission: string) {
  return (ROLE_PERMISSION_MAP[roleName] ?? []).includes(permission);
}

async function subscriptionOwnerHasAccess(input: {
  userId: string;
  orgId: string;
  requiresManagementMode: boolean;
}) {
  const roles = await prisma.user_organization_role.findMany({
    where: {
      user_id: input.userId,
      org_id: input.orgId,
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  const roleNames = roles
    .map((role) => role.role?.name)
    .filter((roleName): roleName is string => Boolean(roleName));

  const hasReadAccess = roleNames.some((roleName) =>
    roleHasPermission(roleName, 'einsaetze:read')
  );

  if (!hasReadAccess) {
    return false;
  }

  if (!input.requiresManagementMode) {
    return true;
  }

  return roleNames.some(
    (roleName) =>
      roleHasPermission(roleName, 'einsaetze:create') ||
      roleHasPermission(roleName, 'einsaetze:update') ||
      roleHasPermission(roleName, 'einsaetze:delete')
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  const prms = await context.params;
  const token = await prms.token;

  const subscription = await prisma.calendar_subscription.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          name: true,
          email: true,
          phone: true,
          helper_name_singular: true,
          helper_name_plural: true,
          einsatz_name_singular: true,
          einsatz_name_plural: true,
        },
      },
    },
  });
  const phone = subscription?.organization.phone;

  if (!subscription || !subscription.is_active)
    return new NextResponse('Not found', { status: 404 });

  const exportConfig = parseCalendarExportConfig(subscription.config);
  const ownerHasAccess = await subscriptionOwnerHasAccess({
    userId: subscription.user_id,
    orgId: subscription.org_id,
    requiresManagementMode: exportConfig.mode === 'verwaltung',
  });

  if (!ownerHasAccess) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Organisationsspezifische Bezeichnungen
  const helperNamePlural =
    subscription.organization.helper_name_plural ?? 'Vermittler:innen';
  const einsatzNameSingular =
    subscription.organization.einsatz_name_singular ?? 'Einsatz';

  const allEinsaetze = await prisma.einsatz.findMany({
    where: { org_id: subscription.org_id },
    orderBy: { start: 'asc' },
    include: {
      organization: {
        select: {
          name: true,
          helper_name_singular: true,
          helper_name_plural: true,
          einsatz_name_singular: true,
        },
      },
      einsatz_to_category: {
        include: {
          einsatz_category: {
            select: {
              id: true,
              value: true,
              abbreviation: true,
            },
          },
        },
      },
      einsatz_field: {
        include: {
          field: {
            select: {
              name: true,
              id: true,
            },
          },
        },
        where: {
          value: {
            not: null,
          },
        },
      },
      einsatz_user_property: {
        include: {
          user_property: {
            include: {
              field: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
        },
      },
      einsatz_helper: {
        orderBy: {
          joined_at: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      einsatz_status: {
        select: {
          verwalter_text: true,
          helper_text: true,
          id: true,
        },
      },
    },
  });

  const { events: einsaetze, trimmedBefore } = filterCalendarExportEvents(
    allEinsaetze,
    exportConfig,
    subscription.user_id
  );

  const baseUrl = process.env.NEXTAUTH_URL;
  let host: string;
  if (!baseUrl) {
    return new NextResponse('Server configuration error', { status: 500 });
  }
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return new NextResponse('Server Configuration Error', { status: 500 });
  }

  const calendar = ical({
    name: `${subscription.name ?? 'Kalenderexport'} - ${
      subscription.organization.name ?? 'Einsatzplaner'
    }`,
    method: ICalCalendarMethod.PUBLISH,
    ttl: 60 * 60 * 2,
    prodId: {
      company: 'Einsatzplaner',
      product: 'Calendar',
      language: 'DE',
    },
  });

  for (const einsatz of einsaetze) {
    const isAllDay = !!einsatz.all_day;

    const categories =
      einsatz.einsatz_to_category
        ?.map(
          (category) =>
            category.einsatz_category.value ||
            category.einsatz_category.abbreviation
        )
        .filter(Boolean) ?? [];
    const categoryAbbreviations = einsatz.einsatz_to_category
      .map((category) => category.einsatz_category.abbreviation)
      .filter((abbreviation) => abbreviation !== '');

    const urlToHelferansichtPage = new URL(
      `/helferansicht?einsatz=${encodeURIComponent(einsatz.id)}`,
      baseUrl
    ).toString();

    const descriptionParts: string[] = [];

    // Titel mit organisationsspezifischer Bezeichnung
    descriptionParts.push(`${einsatzNameSingular}: ${einsatz.title}`);
    descriptionParts.push('');

    // Anmerkung
    if (einsatz.anmerkung && einsatz.anmerkung.trim() !== '') {
      descriptionParts.push(`Anmerkung:`);
      descriptionParts.push(einsatz.anmerkung);
      descriptionParts.push('');
    }

    // Kategorien
    if (categories.length > 0) {
      descriptionParts.push(`Kategorien: ${categories.join(', ')}`);
      descriptionParts.push('');
    }

    // Status
    const statusText =
      exportConfig.mode === 'helper'
        ? einsatz.einsatz_status?.helper_text
        : einsatz.einsatz_status?.verwalter_text;

    if (statusText) {
      descriptionParts.push(`Status: ${statusText}`);
      descriptionParts.push('');
    }

    if (trimmedBefore) {
      descriptionParts.push(
        `Hinweis: Ereignisse vor dem ${trimmedBefore.toLocaleDateString(
          'de-AT'
        )} werden zur besseren Synchronisation nicht exportiert.`
      );
      descriptionParts.push('');
    }

    // Alle benutzerdefinierten Felder
    if (einsatz.einsatz_field && einsatz.einsatz_field.length > 0) {
      const fieldsWithValues = einsatz.einsatz_field.filter(
        (ef) => ef.value && ef.value.trim() !== '' && ef.field?.name
      );

      if (fieldsWithValues.length > 0) {
        descriptionParts.push(`${einsatzNameSingular} Information:`);
        fieldsWithValues.forEach((ef) => {
          if (ef.field.name && ef.value) {
            descriptionParts.push(`  ${ef.field.name}: ${ef.value}`);
          }
        });
        descriptionParts.push('');
      }
    }

    // Teilnehmer und Preisinformationen
    const hasParticipantInfo =
      einsatz.participant_count !== null ||
      einsatz.price_per_person !== null ||
      einsatz.total_price !== null;

    if (hasParticipantInfo) {
      descriptionParts.push('Teilnehmer & Preise:');
      if (einsatz.participant_count !== null) {
        descriptionParts.push(
          `  Teilnehmeranzahl: ${einsatz.participant_count}`
        );
      }
      if (einsatz.price_per_person !== null) {
        descriptionParts.push(
          `  Preis pro Person: €${einsatz.price_per_person.toFixed(2)}`
        );
      }
      if (einsatz.total_price !== null) {
        descriptionParts.push(
          `  Gesamtpreis: €${einsatz.total_price.toFixed(2)}`
        );
      }
      descriptionParts.push('');
    }

    // Vermittler:innen mit organisationsspezifischer Bezeichnung
    if (einsatz.helpers_needed > 0 || einsatz.einsatz_helper.length > 0) {
      descriptionParts.push(`${helperNamePlural}:`);
      if (einsatz.helpers_needed > 0) {
        descriptionParts.push(`  Benötigt: ${einsatz.helpers_needed}`);
      }
      if (einsatz.einsatz_helper.length > 0) {
        descriptionParts.push(`  Angemeldet: ${einsatz.einsatz_helper.length}`);
        einsatz.einsatz_helper.forEach((helper) => {
          descriptionParts.push(
            `    - ${helper.user.firstname} ${helper.user.lastname}`
          );
        });
      }
      descriptionParts.push('');
    }

    // Benötigte Personeneigenschaften
    if (
      einsatz.einsatz_user_property &&
      einsatz.einsatz_user_property.length > 0
    ) {
      descriptionParts.push('Benötigte Personeneigenschaften:');
      einsatz.einsatz_user_property.forEach((prop) => {
        const propertyName = prop.user_property?.field?.name ?? 'Unbekannt';
        const parts: string[] = [`  - ${propertyName}`];

        if (prop.is_required) {
          parts.push('(Pflicht)');
        }

        if (prop.min_matching_users !== null && prop.min_matching_users > 0) {
          parts.push(`Min: ${prop.min_matching_users} Person(en)`);
        }

        descriptionParts.push(parts.join(' '));
      });
      descriptionParts.push('');
    }

    // Link zu Details
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━━');
    descriptionParts.push(
      `Details und weitere Informationen unter: ${urlToHelferansichtPage}`
    );

    const description = descriptionParts.join('\n');

    const start = new Date(einsatz.start);
    let end = new Date(einsatz.end);

    if (isAllDay) {
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    }

    // Ort-Feld für Location verwenden
    const ortField = einsatz.einsatz_field.find(
      (field) =>
        field.field?.name &&
        (field.field.name.toLowerCase() === 'ort' ||
          field.field.name.toLowerCase() === 'location')
    );

    const event = calendar.createEvent({
      start,
      end,
      allDay: isAllDay,
      summary: composeCalendarExportEventTitle({
        title: einsatz.title,
        categoryAbbreviations,
        assignedHelperFirstNames: einsatz.einsatz_helper.map(
          (helper) => helper.user.firstname
        ),
        assignedHelpers: einsatz.einsatz_helper.length,
        helpersNeeded: einsatz.helpers_needed,
        config: exportConfig,
      }),
      description,
      categories: categories.map((name) => ({ name })),
      location: ortField?.value ?? undefined,
      status: ICalEventStatus.CONFIRMED,
    });
    event.uid(`${einsatz.id}@${host}`);

    if (phone || subscription.organization.email) {
      event.organizer({
        name: einsatz.organization?.name ?? undefined,
        email: subscription.organization.email ?? undefined,
      });
    }
  }

  await prisma.calendar_subscription.update({
    where: { token },
    data: { last_accessed: new Date() },
  });

  return new NextResponse(calendar.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${slugifyCalendarExportFilenamePart(
        subscription.organization.name ?? 'einsatzplaner'
      )}-${slugifyCalendarExportFilenamePart(
        subscription.name ?? 'kalenderexport'
      )}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
