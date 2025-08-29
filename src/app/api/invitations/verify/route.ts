import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Token ist erforderlich" }, { status: 400 });
    }

    // Einladung finden und prüfen
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
        //role: { select: { name: true } }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Einladung nicht gefunden" }, { status: 404 });
    }

    // Prüfen ob abgelaufen
    if (invitation.expires_at < new Date()) {
      return NextResponse.json({ error: "Einladung ist abgelaufen" }, { status: 400 });
    }

    // Prüfen ob bereits angenommen
    if (invitation.accepted) {
      return NextResponse.json({ error: "Einladung wurde bereits angenommen" }, { status: 400 });
    }

    // Einladender User laden
    const inviter = await prisma.user.findUnique({
      where: { id: invitation.invited_by },
      select: { firstname: true, lastname: true, email: true }
    });

    const inviterName = inviter?.firstname && inviter?.lastname 
      ? `${inviter.firstname} ${inviter.lastname}`
      : inviter?.email || 'Unbekannt';

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      firstname: invitation.firstname,
      lastname: invitation.lastname,
      organizationName: invitation.organization?.name || 'Organisation',
      roleName: invitation.role?.name || 'Helfer',
      inviterName: inviterName,
      expiresAt: invitation.expires_at.toISOString()
    });

  } catch (error) {
    console.error("❌ Error verifying invitation:", error);
    return NextResponse.json({ 
      error: "Fehler beim Überprüfen der Einladung" 
    }, { status: 500 });
  }
}