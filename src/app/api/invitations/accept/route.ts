import { NextResponse } from "next/server";
import { InvitationServiceFactory } from "@/features/invitations/services/InvitationService";
import { UserRepository, USERS_COLLECTION } from "@/lib/mongo/models/User";
import clientPromise from "@/lib/mongo/client";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen" }, { status: 500 });
        }

        const db = client.db();
        const userRepository = new UserRepository(db);

        // Invitation Service verwenden
        const invitationService = await InvitationServiceFactory.createDefault();
        const { user, invitation } = await invitationService.acceptInvitation(body);

        return NextResponse.json({
            success: true,
            message: "Einladung erfolgreich angenommen",
            user: {
                id: user._id.toString(),
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role,
                organizationName: user.organizationName
            }
        });

    } catch (error) {
        console.error("Error accepting invitation:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Fehler beim Annehmen der Einladung" 
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');
        
        if (!token) {
            return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen" }, { status: 500 });
        }

        const db = client.db();
        const userRepository = new UserRepository(db);

        // Invitation Service verwenden
        const invitationService = await InvitationServiceFactory.createDefault();
        const invitation = await invitationService.getInvitationByToken(token);

        if (!invitation) {
            return NextResponse.json({ error: "Einladung nicht gefunden oder abgelaufen" }, { status: 404 });
        }

        // Einladender Benutzer laden für Namen
        const inviter = await userRepository.findById(invitation.invitedBy);
        
        return NextResponse.json({
            success: true,
            invitation: {
                email: invitation.email,
                firstname: invitation.firstname,
                lastname: invitation.lastname,
                role: invitation.role,
                organizationName: invitation.organizationName,
                inviterName: inviter ? `${inviter.firstname} ${inviter.lastname}` : 'Unbekannt',
                message: invitation.message,
                expiresAt: invitation.expiresAt
            }
        });

    } catch (error) {
        console.error("Error getting invitation:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Fehler beim Laden der Einladung" 
        }, { status: 500 });
    }
}
