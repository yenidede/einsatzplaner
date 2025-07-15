import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import clientPromise from '@/lib/mongo/client';
import { USERS_COLLECTION } from '@/lib/mongo/models/User';

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

        const client = await clientPromise;
        const db = client.db();
        const users = db.collection(USERS_COLLECTION);

        // Finde User mit gültigem Token
        const user = await users.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Ungültiger oder abgelaufener Token' },
                { status: 400 }
            );
        }

        // Hash neues Passwort
        const hashedPassword = await hash(newPassword, 12);

        // Update Passwort und lösche Reset-Token
        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date()
                },
                $unset: {
                    resetToken: 1,
                    resetTokenExpiry: 1
                }
            }
        );

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
