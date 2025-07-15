import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import clientPromise from "@/lib/mongo/client";
import { USERS_COLLECTION, userHelpers, UserFactory } from "@/lib/mongo/models/User";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Validierung mit User-Model Schema
        const userData = userHelpers.validateUserCreation(body);
        
        // Prüfe ob Email bereits existiert
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ error: "Datenbankverbindung fehlgeschlagen" }, { status: 500 });
        }
        const db = client.db();
        
        const existingUser = await db.collection(USERS_COLLECTION).findOne({ 
            email: userData.email 
        });
        if (existingUser) {
            return NextResponse.json({ error: "E-Mail bereits registriert" }, { status: 400 });
        }

        // Passwort hashen
        const passwordHash = await hash(userData.password, 12);
        
        // User für Erstellung vorbereiten
        const userToCreate = UserFactory.create({
            ...userData,
            password: passwordHash
        });

        // User in Datenbank erstellen
        const result = await db.collection(USERS_COLLECTION).insertOne(userToCreate);
    
        return NextResponse.json({ 
            message: "Registrierung erfolgreich",
            user: {
                id: result.insertedId,
                email: userData.email,
                firstname: userData.firstname,
                lastname: userData.lastname,
                role: userData.role
            }
        }, { status: 201 });
    } catch (error) {
        console.error("Fehler bei der Registrierung:", error);
        
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ error: "Registrierung fehlgeschlagen" }, { status: 500 });
    }
}
