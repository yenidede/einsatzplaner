import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUserWithOrgAndRoles } from "@/DataAccessLayer/user";

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token ist erforderlich"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  firstname: z.string().min(1, "Vorname ist erforderlich"),
  lastname: z.string().min(1, "Nachname ist erforderlich"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = acceptInvitationSchema.parse(body);

    // Einladung finden und prüfen
    const invitation = await prisma.invitation.findUnique({
      where: { token: validatedData.token },
      include: {
        organization: true,
        //role: true
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Einladung nicht gefunden" }, { status: 404 });
    }

    if (invitation.expires_at < new Date()) {
      return NextResponse.json({ error: "Einladung ist abgelaufen" }, { status: 400 });
    }

    if (invitation.accepted) {
      return NextResponse.json({ error: "Einladung wurde bereits angenommen" }, { status: 400 });
    }

    // Prüfen ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Benutzer mit dieser E-Mail existiert bereits" }, { status: 400 });
    }

    // Passwort hashen
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // User mit Organisation und Rolle erstellen (verwendet deine DAL-Funktion)
    const newUser = await createUserWithOrgAndRoles({
      email: invitation.email,
      firstname: validatedData.firstname,
      lastname: validatedData.lastname,
      password: hashedPassword,
      orgId: invitation.org_id,
      roleNames: [invitation.role?.name || 'Helfer'],
    });

    // Einladung als angenommen markieren
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { accepted: true }
    });

    console.log('✅ Invitation accepted successfully:', {
      userId: newUser.id,
      email: newUser.email,
      organization: invitation.organization?.name
    });

    return NextResponse.json({
      success: true,
      message: "Einladung erfolgreich angenommen",
      user: {
        id: newUser.id,
        email: newUser.email,
        firstname: newUser.firstname,
        lastname: newUser.lastname
      }
    });

  } catch (error) {
    console.error("❌ Error accepting invitation:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validierungsfehler", 
        details: error.errors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Fehler beim Annehmen der Einladung",
      details: error instanceof Error ? error.message : "Unbekannter Fehler"
    }, { status: 500 });
  }
}
