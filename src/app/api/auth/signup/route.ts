import { NextResponse, NextRequest } from "next/server";
import { hash } from "bcryptjs";
import {
  createUserWithOrgAndRoles,
  getOrCreateOrganizationByName,
  getOrCreateRoleByName,
  getUserByEmail,
} from "@/DataAccessLayer/user";
import { CreateUserSchema } from "@/types/user";

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

    // Rolle anhand des Namens suchen
    const defaultRoleName = "Helfer"; // oder wie deine Standardrolle heißt

    const roleRecord = await getOrCreateRoleByName(defaultRoleName);
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

    return NextResponse.json(
      {
        message: "Registrierung erfolgreich",
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.user_organization_role[0]?.roles?.name,
          orgId: user.user_organization_role[0]?.organization?.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler bei der Registrierung:", error);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
