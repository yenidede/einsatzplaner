import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import ical, { ICalEventStatus, ICalCalendarMethod } from 'ical-generator';

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const prms = await context.params;
  const token = await prms.token;

  const subscription = await prisma.calendar_subscription.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true, email: true, phone: true } },
    },
  });
  const phone = subscription?.organization.phone;

  if (!subscription || !subscription.is_active)
    return new NextResponse('Not found', { status: 404 });

  const einsaetze = await prisma.einsatz.findMany({
    where: { org_id: subscription.org_id },
    orderBy: { start: 'asc' },
    include: {
      organization: { select: { name: true } },
      einsatz_to_category: { include: { einsatz_category: true } },
      einsatz_field: { include: { field: true } },
      einsatz_user_property: {
        include: {
          user_property: {
            include: {
              field: true,
            },
          },
        },
      },
      einsatz_helper: {
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
            },
          },
        },
      },
      einsatz_status: true,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL;
  let host: string;
  if (!baseUrl) {
    return new NextResponse('Server configuration error', { status: 500 });
  }
  try {
    host = new URL(baseUrl).hostname;
  } catch (error) {
    return new NextResponse('Server Configuration Error', { status: 500 });
  }

  const calendar = ical({
    name: subscription.organization.name ?? 'Einsatzplaner - Kalender',
    timezone: 'Europe/Vienna',
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
            category.einsatz_category.abbreviation ||
            category.einsatz_category.value
        )
        .filter(Boolean) ?? [];

    const urlToHelferansichtPage = new URL(
      `/helferansicht?einsatz=${encodeURIComponent(einsatz.id)}`,
      baseUrl
    ).toString();

    const descriptionParts: string[] = [];

    // Titel
    descriptionParts.push(`=== ${einsatz.title} ===`);
    descriptionParts.push('');

    // Anmerkung
    if (einsatz.anmerkung) {
      descriptionParts.push(`📝 Anmerkung:`);
      descriptionParts.push(einsatz.anmerkung);
      descriptionParts.push('');
    }

    // Kategorien
    if (categories.length > 0) {
      descriptionParts.push(`🏷️ Kategorien: ${categories.join(', ')}`);
      descriptionParts.push('');
    }

    // Status
    if (einsatz.einsatz_status) {
      descriptionParts.push(
        `📊 Status: ${einsatz.einsatz_status.verwalter_text}`
      );
      descriptionParts.push('');
    }

    // ALLE benutzerdefinierten Felder (dynamisch)
    if (einsatz.einsatz_field.length > 0) {
      const fieldsWithValues = einsatz.einsatz_field.filter(
        (ef) => ef.value && ef.field.name
      );

      if (fieldsWithValues.length > 0) {
        descriptionParts.push('📋 Einsatzinformationen:');
        fieldsWithValues.forEach((ef) => {
          descriptionParts.push(`   ${ef.field.name}: ${ef.value}`);
        });
        descriptionParts.push('');
      }
    }

    // Teilnehmer und Preisinformationen
    const participantInfo: string[] = [];
    if (
      einsatz.participant_count !== null &&
      einsatz.participant_count !== undefined
    ) {
      participantInfo.push(`👥 Teilnehmeranzahl: ${einsatz.participant_count}`);
    }
    if (
      einsatz.price_per_person !== null &&
      einsatz.price_per_person !== undefined
    ) {
      participantInfo.push(
        `💶 Preis pro Person: €${einsatz.price_per_person.toFixed(2)}`
      );
    }
    if (einsatz.total_price !== null && einsatz.total_price !== undefined) {
      participantInfo.push(
        `💰 Gesamtpreis: €${einsatz.total_price.toFixed(2)}`
      );
    }
    if (participantInfo.length > 0) {
      descriptionParts.push(...participantInfo);
      descriptionParts.push('');
    }

    // Vermittler:innen
    if (einsatz.helpers_needed > 0 || einsatz.einsatz_helper.length > 0) {
      descriptionParts.push('👨‍🏫 Vermittler:innen:');
      if (einsatz.helpers_needed > 0) {
        descriptionParts.push(`   Benötigt: ${einsatz.helpers_needed}`);
      }
      if (einsatz.einsatz_helper.length > 0) {
        descriptionParts.push(
          `   Angemeldet: ${einsatz.einsatz_helper.length}`
        );
        einsatz.einsatz_helper.forEach((helper) => {
          descriptionParts.push(
            `   - ${helper.user.firstname} ${helper.user.lastname}`
          );
        });
      }
      descriptionParts.push('');
    }

    // Benötigte Personeneigenschaften
    if (einsatz.einsatz_user_property.length > 0) {
      descriptionParts.push('Benötigte Personeneigenschaften:');
      einsatz.einsatz_user_property.forEach((prop) => {
        const propertyName = prop.user_property.field.name ?? 'Unbekannt';
        const required = prop.is_required ? ' ⚠️ (Erforderlich)' : '';
        const minUsers =
          prop.min_matching_users !== null &&
          prop.min_matching_users !== undefined
            ? ` - Min: ${prop.min_matching_users} Person(en)`
            : '';
        descriptionParts.push(`   - ${propertyName}${required}${minUsers}`);
      });
      descriptionParts.push('');
    }

    // Link zu Details
    descriptionParts.push('─────────────────────────');
    descriptionParts.push(`🔗 Weitere Details: ${urlToHelferansichtPage}`);

    const description = descriptionParts.join('\n');

    const start = new Date(einsatz.start);
    let end = new Date(einsatz.end);

    if (isAllDay) {
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    }

    // Ort-Feld für Location verwenden
    const ortField = einsatz.einsatz_field.find((field) =>
      (field.field.name ?? '').toLowerCase().match(/^(ort|location)$/)
    );

    const event = calendar.createEvent({
      start,
      end,
      allDay: isAllDay,
      summary: einsatz.title,
      description,
      categories: categories.map((name) => ({ name })),
      location: ortField?.value,
      status: ICalEventStatus.CONFIRMED,
    });

    event.uid(`${einsatz.id}@${host}`);

    if (categories.length) {
      event.categories(categories.map((name) => ({ name })));
    }

    if (phone || subscription.organization.email) {
      event.organizer({
        name: einsatz.organization?.name,
        email: subscription.organization.email || undefined,
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
      'Content-Disposition': `inline; filename="${(
        subscription.organization.name ?? 'einsatzplaner'
      )
        .replace(/\s+/g, '-')
        .toLowerCase()}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
