import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { InvitationServiceFactory } from '@/features/invitations/services/InvitationService';
import { UserRepository } from '@/lib/mongo/models/User';
import clientPromise from '@/lib/mongo/client';

export async function GET(request: Request) {
    try {
        const session = await getServerSession();
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const organizationName = searchParams.get('organization');

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: 'Datenbankverbindung fehlgeschlagen' }, { status: 500 });
        }

        const db = client.db();
        const userRepository = new UserRepository(db);

        // Benutzer laden und Berechtigung prüfen
        const user = await userRepository.findByEmail(session.user.email);
        if (!user) {
            return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
        }

        if (user.role !== 'Organisationsverwaltung' && user.role !== 'Einsatzverwaltung') {
            return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
        }

        const invitationService = await InvitationServiceFactory.createDefault();

        // Statistiken abrufen
        const orgStats = organizationName ? 
            await invitationService.getInvitationStatistics(organizationName, days) : null;
        
        const inviterStats = await invitationService.getInviterStatistics(user._id!, days);

        return NextResponse.json({
            success: true,
            data: {
                organizationStats: orgStats,
                inviterStats,
                period: `${days} days`,
                user: {
                    name: `${user.firstname} ${user.lastname}`,
                    role: user.role,
                    organization: user.organizationName
                }
            }
        });

    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { 
                error: 'Fehler beim Laden der Statistiken', 
                details: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}
