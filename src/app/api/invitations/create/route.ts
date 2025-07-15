import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvitationServiceFactory } from "@/features/invitations/services/InvitationService";
import { UserRepository, USERS_COLLECTION } from "@/lib/mongo/models/User";
import clientPromise from "@/lib/mongo/client";

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
        }

        const body = await req.json();
        
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen" }, { status: 500 });
        }

        const db = client.db();
        const userRepository = new UserRepository(db);

        // Einladender Benutzer laden
        const inviter = await userRepository.findByEmail(session.user.email);
        if (!inviter) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
        }

        // Berechtigung prüfen
        if (inviter.role !== 'Organisationsverwaltung' && inviter.role !== 'Einsatzverwaltung') {
            return NextResponse.json({ error: "Keine Berechtigung zum Einladen von Benutzern" }, { status: 403 });
        }

        // Invitation Service verwenden
        const invitationService = await InvitationServiceFactory.createDefault();
        const { invitation, inviteLink } = await invitationService.createInvitation(body, inviter._id!);

        return NextResponse.json({
            success: true,
            message: "Einladung erfolgreich erstellt und versendet",
            invitation: {
                id: invitation._id?.toString(),
                email: invitation.email,
                firstname: invitation.firstname,
                lastname: invitation.lastname,
                role: invitation.role,
                organizationName: invitation.organizationName,
                createdAt: invitation.createdAt,
                status: invitation.status,
                expiresAt: invitation.expiresAt
            },
            inviteLink
        });

    } catch (error) {
        console.error("Error creating invitation:", error);
        
        // Detaillierte Fehlerbehandlung für Validierungsfehler
        if (error instanceof Error && error.message.includes('Ungültige E-Mail-Adresse')) {
            return NextResponse.json({ 
                error: "Ungültige E-Mail-Adresse. Bitte verwenden Sie eine gültige E-Mail-Adresse (z.B. name@domain.com)" 
            }, { status: 400 });
        }
        
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Fehler beim Erstellen der Einladung" 
        }, { status: 500 });
    }
}
