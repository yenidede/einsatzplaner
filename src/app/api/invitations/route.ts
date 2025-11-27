import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import { CreateInvitationSchema } from "@/features/invitations/types/invitation";
import { InvitationService } from "@/features/invitations/services/InvitationService";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = CreateInvitationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Ungültige Eingabedaten",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, organizationId } = parseResult.data;

    // Hole aktuellen User
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        user_organization_role: {
          where: { org_id: organizationId },
          include: {
            role: true,
          },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User nicht gefunden" },
        { status: 404 }
      );
    }

    // Prüfe Berechtigung (nur OrgVerwaltung und Superadmin)
    const userRole = currentUser.user_organization_role[0]?.role?.name;
    const canInvite = ["Organisationsverwaltung", "Superadmin"].includes(
      userRole || ""
    );

    if (!canInvite) {
      return NextResponse.json(
        { error: "Keine Berechtigung zum Einladen von Benutzern" },
        { status: 403 }
      );
    }

    // Erstelle Einladung
    const invitation = await InvitationService.createInvitation(
      email,
      organizationId,
      currentUser.id
    );

    return NextResponse.json(
      {
        message: "Einladung erfolgreich versendet",
        invitation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Fehler beim Erstellen der Einladung" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Hole aktive Einladungen für Organisation
    const invitations = await prisma.invitation.findMany({
      where: {
        org_id: orgId,
        accepted: false,
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: { firstname: true, lastname: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Einladungen" },
      { status: 500 }
    );
  }
}
