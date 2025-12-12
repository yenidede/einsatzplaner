import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

interface RequestBody {
  organizationId: string;
  role: string;
  action: "add" | "remove";
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }
    const { userId } = await params;
    const body: RequestBody = await request.json();
    const { organizationId, role, action } = body;

    if (!organizationId || !role || !action) {
      return NextResponse.json(
        { error: "Fehlende Felder erforderlich" },
        { status: 400 }
      );
    }

    const validRoles = [
      "OV",
      "EV",
      "Einsatzverwaltung",
      "Organisationsverwaltung",
      "Helfer",
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
    }

    const currentUserInOrganisation =
      await prisma.user_organization_role.findFirst({
        where: {
          user_id: session.user.id,
          org_id: organizationId,
        },
        include: {
          role: true,
        },
      });

    if (!currentUserInOrganisation) {
      return NextResponse.json(
        { error: "Sie sind nicht Mitglied dieser Organisation" },
        { status: 403 }
      );
    }

    const targetUserOrganisation =
      await prisma.user_organization_role.findFirst({
        where: {
          user_id: session.user.id,
          org_id: organizationId,
        },
        include: {
          user: true,
          role: true,
        },
      });

    if (!targetUserOrganisation) {
      return NextResponse.json(
        { error: "Benutzer ist nicht Mitglied dieser Organisation" },
        { status: 403 }
      );
    }

    const roleAbb = await prisma.role.findFirst({
      where: {
        abbreviation: role,
      },
    });

    if (!roleAbb) {
      return NextResponse.json(
        { error: "Rolle nicht gefunden" },
        { status: 404 }
      );
    }

    const currentUserRoles = await prisma.user_organization_role.findMany({
      where: {
        user_id: userId,
        org_id: organizationId,
      },
      include: {
        role: true,
      },
    });

    if (action === "add") {
      const hasRole = currentUserRoles.some(
        (uor: any) => uor.role.abbreviation === role
      );

      if (hasRole) {
        return NextResponse.json(
          { message: "User hat bereits diese Rolle" },
          { status: 200 }
        );
      }

      await prisma.user_organization_role.create({
        data: {
          user_id: userId,
          org_id: organizationId,
          role_id: roleAbb.id,
        },
      });

      return NextResponse.json({
        message: `Rolle ${role} erfolgreich hinzugefügt`,
        user: {
          id: targetUserOrganisation.user.id,
          firstName: targetUserOrganisation.user.firstname,
          lastName: targetUserOrganisation.user.lastname,
        },
        role: role,
        action: "added",
      });
    } else if (action === "remove") {
      const hasRoleToRemove = currentUserRoles.find(
        (uor) => uor.role.abbreviation === role
      );

      if (!hasRoleToRemove) {
        return NextResponse.json(
          { message: "Benutzer hat diese Rolle nicht" },
          { status: 200 }
        );
      }

      if (currentUserRoles.length === 1) {
        return NextResponse.json(
          { error: "Benutzer muss mehr als eine Rolle zu Verfügung haben" },
          { status: 400 }
        );
      }

      await prisma.user_organization_role.delete({
        where: {
          id: hasRoleToRemove.id,
        },
      });

      return NextResponse.json({
        message: `Rolle ${role} erfolgreich entfernt`,
        user: {
          id: targetUserOrganisation.user.id,
          firstname: targetUserOrganisation.user.firstname,
          lastname: targetUserOrganisation.user.lastname,
        },
        role: role,
        action: "removed",
      });
    }
  } catch (error) {
    console.error("Fehler beim Ändern der Benutzerrolle", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId ist erforderlich" },
        { status: 400 }
      );
    }

    // Benutzerrollen abrufen
    const userRoles = await prisma.user_organization_role.findMany({
      where: {
        user_id: userId,
        org_id: organizationId,
      },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    });

    if (userRoles.length === 0) {
      return NextResponse.json(
        { error: "Benutzer ist nicht Mitglied dieser Organisation" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: userRoles[0].user,
      roles: userRoles.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        abbreviation: ur.role.abbreviation,
      })),
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Benutzerrollen:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
