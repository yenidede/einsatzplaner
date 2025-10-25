import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = acceptSchema.parse(body);

    // Einladung finden und validieren
    const invitation = await prisma.invitation.findFirst({
      where: {
        token: token,
        email: session.user.email,
        accepted: false,
        expires_at: { gt: new Date() }
      },
      include: {
        organization: true,
        role: true
      }
    });

    if (!invitation) {
      return NextResponse.json({ 
        error: "Einladung nicht gefunden oder bereits akzeptiert" 
      }, { status: 404 });
    }

    // User finden
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }

    // Prüfen ob User bereits in Organisation
    const existingRole = await prisma.user_organization_role.findFirst({
      where: {
        user_id: user.id,
        org_id: invitation.org_id
      }
    });

    if (existingRole) {
      return NextResponse.json({ 
        error: "Sie sind bereits Mitglied dieser Organisation" 
      }, { status: 400 });
    }

    // Transaction für Einladungsannahme
    await prisma.$transaction(async (tx) => {
      // User zur Organisation hinzufügen
      await tx.user_organization_role.create({
        data: {
          user_id: user.id,
          org_id: invitation.org_id,
          role_id: invitation.role_id
        }
      });

      // Einladung als akzeptiert markieren
      /* await tx.invitation.update({
        where: { token: invitation.token },
        data: { accepted: true }
      }); */
      await tx.invitation.delete({
        where: { token: invitation.token }
      });
    });

/*     console.log("✅ Invitation accepted:", {
      invitationId: invitation.id,
      userId: user.id,
      orgId: invitation.org_id,
      roleId: invitation.role_id
    }); */

    return NextResponse.json({
      success: true,
      message: "Einladung erfolgreich angenommen",
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name
      }
    });

  } catch (error) {
/*     console.error("❌ Error accepting invitation:", error); */
    
    // ✅ Detaillierte Fehlerausgabe
    if (error instanceof Error) {
/*       console.error("Error message:", error.message);
      console.error("Error stack:", error.stack); */
    }
    
    // ✅ Prisma-spezifische Fehler
    if (error && typeof error === 'object' && 'code' in error) {
/*       console.error("Prisma error code:", (error as any).code);
      console.error("Prisma error meta:", (error as any).meta); */
    }
    
    return NextResponse.json({ 
      error: "Fehler beim Akzeptieren der Einladung",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = acceptSchema.parse(body);
    const deletedInvitation = await prisma.invitation.deleteMany({
      where: { token: token }
    }); 
    return NextResponse.json({ 
      success: true, 
      message: "Einladung erfolgreich gelöscht",
      deletedCount: deletedInvitation.count
    });
  } catch (error) {
/*     console.error("❌ Error deleting invitation:", error); */
    return NextResponse.json({ 
      error: "Fehler beim Löschen der Einladung",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } 
}