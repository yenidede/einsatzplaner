// app/api/calendar/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // prüf deinen Pfad
import prisma from "@/lib/prisma";
import {
  getOrCreateCalendarSubscription,
  rotateCalendarSubscription,
  deactivateCalendarSubscription,
  buildCalendarSubscriptionUrl,
} from "@/features/calendar/calendarSubscription"; // prüf den Export-Pfad

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const subscription = await getOrCreateCalendarSubscription(orgId, session.user.id);

  return NextResponse.json({
    id: subscription.id,
    name: subscription.name,
    is_active: subscription.is_active,
    token: subscription.token,
    webcalUrl: buildCalendarSubscriptionUrl(subscription.token),
    last_accessed: subscription.last_accessed,
  });
}

export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const subscription = await prisma.calendar_subscription.findUnique({ where: { id } });
    if (!subscription || subscription.user_id !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rotated = await rotateCalendarSubscription(id);
    return NextResponse.json({
        id: rotated.id,
        token: rotated.token,
        webcalUrl: buildCalendarSubscriptionUrl(rotated.token),
    });
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    } 

    const subscription = await prisma.calendar_subscription.findUnique({ where: { id } });
    if (!subscription || subscription.user_id !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } 

    await deactivateCalendarSubscription(id);
    return NextResponse.json({ ok: true });
}
