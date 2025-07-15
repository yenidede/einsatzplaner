import { NextResponse } from 'next/server';
import { InvitationServiceFactory } from '@/features/invitations/services/InvitationService';

export async function POST(request: Request) {
    try {
        // Überprüfe ob es ein authentifizierter Admin-Request ist
        const authHeader = request.headers.get('authorization');
        if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const invitationService = await InvitationServiceFactory.createDefault();
        
        // Bereinigung ausführen
        const cleanupResult = await invitationService.cleanupExpiredInvitations();
        
        // Reminder-E-Mails senden
        const remindersSent = await invitationService.sendReminderEmails();

        return NextResponse.json({
            success: true,
            message: 'Invitation maintenance completed',
            results: {
                expiredInvitations: cleanupResult.cleaned,
                anonymizedInvitations: cleanupResult.anonymized,
                remindersSent
            }
        });

    } catch (error) {
        console.error('Invitation maintenance error:', error);
        return NextResponse.json(
            { 
                error: 'Maintenance failed', 
                details: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}

// Für manuelle Ausführung
export async function GET() {
    return NextResponse.json({
        message: 'Invitation maintenance endpoint',
        usage: 'POST with Authorization header'
    });
}
