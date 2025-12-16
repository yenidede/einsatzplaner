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

    const invitation = await prisma.invitation.findUnique({
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

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: "Einladung nicht gefunden" },
        { status: 404 }
      );
    }

    // Prüfe ob abgelaufen
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "Einladung ist abgelaufen" },
        { status: 410 }
      );
    }

    // Prüfe ob bereits akzeptiert
    if (invitation.accepted) {
      return NextResponse.json(
        { valid: false, error: "Einladung wurde bereits akzeptiert" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
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
