// GET Handler für Userdaten
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
        }
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen" }, { status: 500 });
        }
        const db = client.db();
        const user = await db.collection(USERS_COLLECTION).findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
        }
        return NextResponse.json({
            id: user._id.toString(),
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            role: user.role
        });
    } catch (error) {
        console.error("API Error (GET):", error);
        return NextResponse.json({ error: "Fehler beim Laden der Benutzerdaten" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import clientPromise from "@/lib/mongo/client";
import { USERS_COLLECTION } from "@/lib/mongo/models/User";
import { ObjectId } from "mongodb";

// POST Handler (für Kompatibilität)
export async function POST(req: Request) {
    return handleUserUpdate(req);
}

// PUT Handler (vom UserService verwendet)
export async function PUT(req: Request) {
    return handleUserUpdate(req);
}

// Gemeinsame Handler-Funktion
async function handleUserUpdate(req: Request) {
    try {
        console.log('API Route called with method:', req.method);
        
        const body = await req.json();
        console.log('Received body:', body);
        
        const { userId, email, firstname, lastname, currentPassword, newPassword } = body;

        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
        }

        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen" }, { status: 500 });
        }
        const db = client.db();

        // Benutzer laden
        const currentUser = await db.collection(USERS_COLLECTION).findOne({ 
            _id: new ObjectId(userId) 
        });

        if (!currentUser) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
        }

        // Update-Daten vorbereiten
        const updateData: any = {
            email: email || currentUser.email,
            firstname: firstname || currentUser.firstname,
            lastname: lastname || currentUser.lastname,
            updatedAt: new Date()
        };

        // Passwort aktualisieren falls angegeben
        if (newPassword && currentPassword) {
            const isValidPassword = await compare(currentPassword, currentUser.password);
            if (!isValidPassword) {
                return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 400 });
            }
            updateData.password = await hash(newPassword, 12);
        }

        // Benutzer aktualisieren
        const result = await db.collection(USERS_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: "Keine Änderungen vorgenommen" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Profil erfolgreich aktualisiert",
            data: {
                id: userId,
                email: updateData.email,
                firstname: updateData.firstname,
                lastname: updateData.lastname,
                role: currentUser.role
            }
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ 
            success: false,
            error: "Profil-Update fehlgeschlagen" 
        }, { status: 500 });
    }
}