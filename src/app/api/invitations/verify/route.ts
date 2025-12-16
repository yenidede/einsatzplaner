import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token ist erforderlich" },
        { status: 400 }
      );
    }
    const invitations = await prisma.invitation.findMany({
      where: { token },
      include: {
        organization: { select: { name: true } },
        role: { select: { name: true } },
      },
    });

    if (!invitations || invitations.length === 0) {
      return NextResponse.json(
        { error: "Einladung nicht gefunden" },
        { status: 404 }
      );
    }

    const firstInvitation = invitations[0];

    if (firstInvitation.expires_at < new Date()) {
      return NextResponse.json(
        { error: "Einladung ist abgelaufen" },
        { status: 400 }
      );
    }

    if (firstInvitation.accepted) {
      return NextResponse.json(
        { error: "Einladung wurde bereits angenommen" },
        { status: 400 }
      );
    }

    const inviter = await prisma.user.findUnique({
      where: { id: firstInvitation.invited_by },
      select: { firstname: true, lastname: true, email: true },
    });

    const inviterName =
      inviter?.firstname && inviter?.lastname
        ? `${inviter.firstname} ${inviter.lastname}`
        : inviter?.email || "Unbekannt";

    const roleNames = invitations
      .map((inv) => inv.role?.name)
      .filter(Boolean)
      .join(", ");

    return NextResponse.json({
      id: firstInvitation.id,
      email: firstInvitation.email,
      organizationName: firstInvitation.organization?.name || "Organisation",
      roleName: roleNames || "Helfer",
      roles: invitations.map((inv) => ({
        id: inv.role_id,
        name: inv.role?.name || "Unbekannt",
      })),
      inviterName: inviterName,
      expiresAt: firstInvitation.expires_at.toISOString(),
    });
  } catch (error) {
    console.error("Error verifying invitation:", error);
    return NextResponse.json(
      {
        error: "Fehler beim Überprüfen der Einladung",
      },
      { status: 500 }
    );
  }
}
