import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { emailService } from '@/lib/email/EmailService';
import { getUserByEmail, updateUserResetToken } from '@/DataAccessLayer/user';



export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        const hour = 3600000; // 1 Stunde in Millisekunden
        if (!email) {
            return NextResponse.json(
                { error: 'E-Mail-Adresse ist erforderlich' },
                { status: 400 }
            );
        }

        // Prüfe ob User existiert
        const user = await getUserByEmail(email);
        if (!user) {
            // Aus Sicherheitsgründen immer erfolgreiche Antwort senden
            return NextResponse.json(
                { message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.' },
                { status: 200 }
            );
        }

        // Generiere Reset-Token
        const resetToken = randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + hour); // 1 Stunde

        // Speichere Reset-Token in der Datenbank
        await updateUserResetToken(email, resetToken, resetTokenExpiry);

        // E-Mail senden
        try {
            await emailService.sendPasswordResetEmail(email, resetToken);
            console.log(`Password reset email sent to ${email}`);
        } catch (emailError) {
            console.error('Error sending password reset email:', emailError);
            // Fallback: Log the reset link in console
            console.log(`Reset-Token für ${email}: ${resetToken}`);
            console.log(`Reset-Link: ${process.env.NEXTAUTH_URL}/api/auth/reset-password?token=${resetToken}`);
        }

        return NextResponse.json(
            { message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Fehler beim Verarbeiten der Anfrage' },
            { status: 500 }
        );
    }
}
