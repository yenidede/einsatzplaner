import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token ist erforderlich" },
        { status: 400 }
      );
    }

    const invitations = await prisma.invitation.findMany({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    if (!invitations || invitations.length === 0) {
      return NextResponse.json(
        { valid: false, error: "Einladung nicht gefunden" },
        { status: 404 }
      );
    }

    // Filtere abgelaufene und bereits akzeptierte Einladungen
    const validInvitations = invitations.filter(
      (inv) => new Date(inv.expires_at) >= new Date() && !inv.accepted
    );

    if (validInvitations.length === 0) {
      return NextResponse.json(
        { valid: false, error: "Keine gültigen Einladungen gefunden" },
        { status: 410 }
      );
    }

    const firstInvitation = validInvitations[0];

    const roles = validInvitations.map((inv) => ({
      id: inv.role_id,
      name: inv.role?.name || "Unbekannt",
    }));

    const roleNames = validInvitations
      .map((inv) => inv.role?.name)
      .filter(Boolean)
      .join(", ");

    return NextResponse.json({
      valid: true,
      invitation: {
        id: firstInvitation.id,
        email: firstInvitation.email,
        organizationId: firstInvitation.org_id,
        organizationName: firstInvitation.organization?.name || "Organisation",
        roleName: roleNames || "Helfer",
        roles: roles,
        token: firstInvitation.token,
        expiresAt: firstInvitation.expires_at.toISOString(),
        createdAt: firstInvitation.created_at.toISOString(),
        inviterName:
          firstInvitation.user?.firstname && firstInvitation.user?.lastname
            ? `${firstInvitation.user.firstname} ${firstInvitation.user.lastname}`
            : "Unbekannt",
      },
    });
  } catch (error) {
    console.error("Invitation validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Serverfehler" },
      { status: 500 }
    );
  }
}
