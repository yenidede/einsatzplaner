import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { getUserWithValidResetToken, resetUserPassword } from '@/DataAccessLayer/user';



export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();
        
        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token und neues Passwort sind erforderlich' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Passwort muss mindestens 8 Zeichen haben' },
                { status: 400 }
            );
        }

        // Finde User mit gültigem Token und Ablaufdatum
        const user = await getUserWithValidResetToken(token);

        if (!user) {
            return NextResponse.json(
                { error: 'Ungültiger oder abgelaufener Token' },
                { status: 400 }
            );
        }

        // Hash neues Passwort
        const hashedPassword = await hash(newPassword, 12);

        // Update Passwort und lösche Reset-Token
        await resetUserPassword(user, hashedPassword);

        return NextResponse.json(
            { message: 'Passwort erfolgreich zurückgesetzt' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Fehler beim Zurücksetzen des Passworts' },
            { status: 500 }
        );
    }
}
