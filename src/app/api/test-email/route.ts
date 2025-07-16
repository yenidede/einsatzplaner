import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/EmailService';

export async function POST(request: NextRequest) {
    try {
        const { to, subject, content } = await request.json();

        if (!to || !subject || !content) {
            return NextResponse.json(
                { error: 'Fehlende Parameter: to, subject, content' },
                { status: 400 }
            );
        }

        const emailService = new EmailService();
        await emailService.sendInvitationEmail(to, subject, content);

        return NextResponse.json({ 
            message: 'E-Mail erfolgreich gesendet',
            details: { to, subject }
        });

    } catch (error) {
        console.error('E-Mail-Test Fehler:', error);
        return NextResponse.json(
            { error: 'Fehler beim E-Mail-Versand', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
