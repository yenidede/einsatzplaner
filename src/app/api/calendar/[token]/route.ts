import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import ical, { ICalEventStatus, ICalCalendarMethod } from "ical-generator";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  // good variable name for params extraction
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
    return new NextResponse("Not found", { status: 404 });

  const einsaetze = await prisma.einsatz.findMany({
    where: { org_id: subscription.org_id },
    orderBy: { start: "asc" },
    include: {
      organization: { select: { name: true } },
      einsatz_to_category: { include: { einsatz_category: true } },
      einsatz_field: { include: { field: true } },
    },
  });
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://localhost:3000";
  const host = new URL(baseUrl).hostname;
  const calendar = ical({
    name: subscription.organization.name ?? "Einsatzplaner - Kalender",
    timezone: "Europe/Vienna",
    method: ICalCalendarMethod.PUBLISH,
    ttl: 60 * 60 * 2,
    prodId: {
      company: "Einsatzplaner",
      product: "Calendar",
      language: "DE",
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

    const ortField = einsatz.einsatz_field.find((field) =>
      (field.field.name ?? "").toLowerCase().match("/^(ort|location)$/")
    );

    const urlToHelferansichtPage = new URL(
      "/helferansicht",
      baseUrl
    ).toString();

    const start = einsatz.start;
    let end = einsatz.end;
    if (isAllDay) {
      end = new Date(einsatz.end);
      end.setDate(end.getDate() + 1);
    }

    const event = calendar.createEvent({
      start,
      end,
      allDay: isAllDay,
      summary: einsatz.title,
      description: `Details und weitere Informationen unter: ${urlToHelferansichtPage}`,
      /* url: urlToEinsatzPage, */
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
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${(
        subscription.organization.name ?? "einsatzplaner"
      )
        .replace(/\s+/g, "-")
        .toLowerCase()}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
