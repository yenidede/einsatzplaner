import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import clientPromise from '@/lib/mongo/client';
import { USERS_COLLECTION } from '@/lib/mongo/models/User';
import { emailService } from '@/lib/email/EmailService';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        
        if (!email) {
            return NextResponse.json(
                { error: 'E-Mail-Adresse ist erforderlich' },
                { status: 400 }
            );
        }

        const client = await clientPromise;
        const db = client.db();
        const users = db.collection(USERS_COLLECTION);

        // Prüfe ob User existiert
        const user = await users.findOne({ email });
        if (!user) {
            // Aus Sicherheitsgründen immer erfolgreiche Antwort senden
            return NextResponse.json(
                { message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.' },
                { status: 200 }
            );
        }

        // Generiere Reset-Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Stunde

        // Speichere Reset-Token in der Datenbank
        await users.updateOne(
            { email },
            { 
                $set: { 
                    resetToken,
                    resetTokenExpiry,
                    updatedAt: new Date()
                }
            }
        );

        // E-Mail senden
        try {
            await emailService.sendPasswordResetEmail(email, resetToken);
            console.log(`Password reset email sent to ${email}`);
        } catch (emailError) {
            console.error('Error sending password reset email:', emailError);
            // Fallback: Log the reset link in console
            console.log(`Reset-Token für ${email}: ${resetToken}`);
            console.log(`Reset-Link: ${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`);
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
