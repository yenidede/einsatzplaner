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

    return NextResponse.json({
      valid: true,
      invitations: validInvitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        organization_id: invitation.org_id,
        role_id: invitation.role_id,
        token: invitation.token,
        expires_at: invitation.expires_at.toISOString(),
        created_at: invitation.created_at.toISOString(),
        organization: invitation.organization,
        role: invitation.role,
        inviter: invitation.user
          ? {
              firstname: invitation.user.firstname,
              lastname: invitation.user.lastname,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Invitation validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Serverfehler" },
      { status: 500 }
    );
  }
}
