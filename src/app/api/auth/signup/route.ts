import { NextResponse, NextRequest } from "next/server";
import { hash } from "bcryptjs";
import {
  createUserWithOrgAndRoles,
  getOrCreateOrganizationByName,
  getUserByEmail,
} from "@/DataAccessLayer/user";
import { CreateUserSchema } from "@/types/user";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validierung mit Zod
    const parseResult = CreateUserSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabedaten", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const userData = parseResult.data;

    // Prüfe, ob E-Mail bereits existiert
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: "E-Mail bereits registriert" },
        { status: 400 }
      );
    }

    // Organisation anhand des Namens suchen oder anlegen
    const organization = await getOrCreateOrganizationByName(
      userData.organizationName
    );

    // Standard-Rolle für neue User finden oder erstellen
    const defaultRoleName = "Helfer";
    let roleRecord = await prisma.role.findFirst({
      where: { name: defaultRoleName },
    });

    // Falls Rolle nicht existiert, erstelle sie
    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: {
          name: defaultRoleName,
        },
      });
    }

    if (!roleRecord) {
      return NextResponse.json(
        { error: "Rolle konnte nicht erstellt oder gefunden werden" },
        { status: 500 }
      );
    }

    // Passwort hashen
    const passwordHash = await hash(userData.password, 12);

    // User anlegen
    const user = await createUserWithOrgAndRoles({
      email: userData.email,
      firstname: userData.firstname,
      lastname: userData.lastname,
      password: passwordHash,
      phone: userData.phone,
      orgId: organization.id,
      roleIds: [roleRecord.id],
    });

    // Sichere User-Daten für Response (ohne Passwort)
    const safeUserData = {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
    };

    // Hole die tatsächlich erstellte user_organization_role Beziehung
    const userOrgRole = await prisma.user_organization_role.findFirst({
      where: {
        user_id: user.id,
        org_id: organization.id,
      },
      include: {
        role: true,
        organization: true,
      },
    });

    return NextResponse.json(
      {
        message: "Registrierung erfolgreich",
        user: {
          ...safeUserData,
          role: userOrgRole?.role?.name || defaultRoleName,
          roleId: userOrgRole?.role?.id,
          organizationId: organization.id,
          organizationName: organization.name,
        },
        redirect: '/dashboard',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler bei der Registrierung:", error);

    // Spezifische Fehlerbehandlung
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "E-Mail bereits registriert" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
