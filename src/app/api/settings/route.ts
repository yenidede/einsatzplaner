import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/prisma";

// GET Handler für Userdaten
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
    }

    // Hole Userdaten
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone: true,
            picture_url: true,
            hasLogoinCalendar: true,
        },
    });

    
    // Hole alle Organisationen inkl. aller Rollen für den User (korrektes Mapping)
    const organizations = await prisma.user_organization_role.findMany({
        where: { user_id: userId },
        select: {
            id: true,
            hasGetMailNotification: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                },
            },
            role_assignments: {
                select: {
                    role: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    // Response zusammenbauen
    return new Response(
        JSON.stringify({
            ...user,
            organizations: organizations.map(entry => {
                // Extrahiere alle Rollennamen als Array
                const rollen = Array.isArray(entry.role_assignments)
                  ? entry.role_assignments.map(r => r.role?.name).filter(Boolean)
                  : [];
                return {
                    id: entry.organization.id,
                    orgId: entry.organization.id,
                    userOrgRoleId: entry.id,
                    name: entry.organization.name,
                    roles: rollen,
                    hasGetMailNotification: entry.hasGetMailNotification,
                };
            }),
        }),
        { status: 200 }
    );
}

// POST Handler (für Kompatibilität)
export async function POST(req: Request) {
    return handleUserUpdate(req);
}

// PUT Handler (vom UserService verwendet)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { userId, userOrgId, email, firstname, lastname, hasLogoinCalendar, hasGetMailNotification } = body;

        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
        }

        // User updaten
        const updateUserData: any = {
            email,
            firstname,
            lastname,
            picture_url: body.picture_url,
            phone: body.phone,
            updated_at: new Date(),
        };
        if (hasLogoinCalendar !== undefined) {
            updateUserData.hasLogoinCalendar = hasLogoinCalendar;
        }

        await prisma.user.update({
            where: { id: userId },
        });


        // User-Org-Settings updaten (optional)
        if (userOrgId && hasGetMailNotification !== undefined) {
            await prisma.user_organization_role.update({
                where: { id: userOrgId },
                data: {
                    hasGetMailNotification: hasGetMailNotification,
                },
            });
        }
        console.log("User updated:", { userId, email, firstname, lastname, hasLogoinCalendar, hasGetMailNotification });

        return NextResponse.json({ success: true, message: "Profil erfolgreich aktualisiert" });
    } catch (error) {
        console.error("API Error (PUT):", error);
        return NextResponse.json({ error: "Profil-Update fehlgeschlagen" }, { status: 500 });
    }
}

// Gemeinsame Handler-Funktion
async function handleUserUpdate(req: Request) {
    try {
        const body = await req.json();
        const { userId, email, firstname, lastname, currentPassword, newPassword } = body;

        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
        }

        // Benutzer laden
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!currentUser) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
        }

        // Update-Daten vorbereiten
        const updateData: any = {
            email: email || currentUser.email,
            firstname: firstname || currentUser.firstname,
            lastname: lastname || currentUser.lastname,
            updated_at: new Date()
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
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        console.log("User updated:", updatedUser);
        return NextResponse.json({
            success: true,
            message: "Profil erfolgreich aktualisiert",
            data: {
                id: userId,
                email: updatedUser.email,
                firstname: updatedUser.firstname,
                lastname: updatedUser.lastname
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