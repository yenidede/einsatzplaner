import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { emailService } from '@/lib/email/EmailService';

// Validation Schema - role_id wieder hinzufügen
const createInvitationSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  organizationId: z.string().min(1, "Organisation ID ist erforderlich"),
  roleId: z.string().optional(), // <-- Wieder einkommentieren
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    // Request Body validieren
    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    // Einladender User finden mit ALLEN Rollen in der spezifischen Organisation
    const inviter = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        user_organization_role: {
          where: { org_id: validatedData.organizationId }, // <-- WICHTIG: Nur Rollen in DIESER Organisation!
          include: { role: true }
        }
      }
    });

    if (!inviter) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }

    // Debug: Schaue welche Rollen gefunden wurden
    console.log('🔍 API Debug - Found User Roles:', {
      inviterEmail: inviter.email,
      organizationId: validatedData.organizationId,
      userOrgRoles: inviter.user_organization_role,
      roleDetails: inviter.user_organization_role.map(uor => ({
        roleName: uor.role?.name,
        roleAbbr: uor.role?.abbreviation,
        roleId: uor.role?.id
      }))
    });

    // Permission Check - prüfe auf alle möglichen Namen/Abkürzungen
    const roleNames = inviter.user_organization_role.map(uor => uor.role?.name || '');
    const roleAbbrs = inviter.user_organization_role.map(uor => uor.role?.abbreviation || '');

    const canInvite = roleNames.includes('Organisationsverwaltung') || 
                     roleAbbrs.includes('OV') || 
                     roleNames.includes('Superadmin') ||
                     roleNames.includes('Einsatzverwaltung') || // Falls EV auch einladen darf
                     roleAbbrs.includes('EV');

    console.log('🔍 Permission Check Result:', {
      roleNames,
      roleAbbrs,
      canInvite
    });

    if (!canInvite) {
      return NextResponse.json({ 
        error: "Keine Berechtigung zum Einladen von Benutzern",
        debug: { roleNames, roleAbbrs }
      }, { status: 403 });
    }

    // Organisation existiert prüfen
    const organization = await prisma.organization.findUnique({
      where: { id: validatedData.organizationId }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });
    }

    // Prüfen ob User bereits in Organisation
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        user_organization_role: {
          where: { org_id: validatedData.organizationId }
        }
      }
    });


    if (existingUser && existingUser?.user_organization_role.length > 0) {
      return NextResponse.json({ 
        error: "Benutzer ist bereits Mitglied dieser Organisation" 
      }, { status: 400 });
    }

    // Prüfen ob bereits eine offene Einladung existiert
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: validatedData.email,
        org_id: validatedData.organizationId,
        expires_at: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      return NextResponse.json({ 
        error: "Es existiert bereits eine offene Einladung für diese E-Mail-Adresse" 
      }, { status: 400 });
    }

    // Invitation Token generieren
    const token = crypto.randomBytes(32).toString('hex');
    
    // Standard-Rolle finden (Helfer) - DIESEN BLOCK WIEDER EINKOMMENTIEREN
    let roleId = validatedData.roleId;
    if (!roleId) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: "Helfer" }
      });
      roleId = defaultRole?.id;
    }

    if (!roleId) {
      return NextResponse.json({ error: "Standard-Rolle nicht gefunden" }, { status: 500 });
    }

    // Einladung erstellen - nur die unterstützten Felder verwenden
    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        org_id: validatedData.organizationId,
        role_id: roleId, // <-- Wieder einkommentieren
        invited_by: inviter.id,
        token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        accepted: false,
      },
      include: {
        organization: true,
        role: true, // <-- Auch wieder einkommentieren
        user: true // <-- User Relation einschließen (invited_by)
      }
    });

    // Invite Link generieren
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    // E-Mail senden
    try {
      // Einladender Name ermitteln
      const inviterName = inviter.firstname && inviter.lastname 
        ? `${inviter.firstname} ${inviter.lastname}`
        : inviter.email;

      await emailService.sendInvitationEmail(
        invitation.email,
        inviterName,
        organization.name,
        token
      );
      
      console.log('✅ Invitation email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      // E-Mail Fehler nicht als kritisch behandeln - Einladung wurde trotzdem erstellt
    }

    console.log('✅ Invitation created:', {
      id: invitation.id,
      email: invitation.email,
      organization: organization.name,
      inviteLink: inviteLink
    });

    return NextResponse.json({
      success: true,
      message: "Einladung erfolgreich erstellt",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        accepted: invitation.accepted,  // <-- Das Feld existiert
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      },
      inviteLink: inviteLink
    });

  } catch (error) {
    console.error("❌ Error creating invitation:", error);
    
    // Zod Validation Errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validierungsfehler", 
        details: error 
      }, { status: 400 });
    }
    
    // Prisma Errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ 
        error: "Einladung existiert bereits" 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Fehler beim Erstellen der Einladung",
      details: error instanceof Error ? error.message : "Unbekannter Fehler"
    }, { status: 500 });
  }
}
