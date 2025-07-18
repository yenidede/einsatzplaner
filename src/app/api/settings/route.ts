import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/prisma";

// GET Handler für Userdaten
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                user_organization_role: {
                    include: {
                        roles: true,
                        organization: true
                    }
                }
            }
        });
        if (!user) {
            return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
        }
        return NextResponse.json({
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            phone: user.phone,
            logo_url: user.logo_url,
            hasLogoinCalendar: user.hasLogoinCalendar,
            role: user.user_organization_role?.[0]?.roles?.name || "",
            orgId: user.user_organization_role?.[0]?.organization?.id || ""
        });
    } catch (error) {
        console.error("API Error (GET):", error);
        return NextResponse.json({ error: "Fehler beim Laden der Benutzerdaten" }, { status: 500 });
    }
}

// POST Handler (für Kompatibilität)
export async function POST(req: Request) {
    return handleUserUpdate(req);
}

// PUT Handler (vom UserService verwendet)
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { userId, userOrgId, email, firstname, lastname, showLogosInCalendar, getMailFromOrganization } = body;

        if (!userId) {
            return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
        }

        // User updaten
        const updateUserData: any = {
            email,
            firstname,
            lastname,
            logo_url: body.logo_url,
            phone: body.phone,
            updated_at: new Date(),
        };
        if (showLogosInCalendar !== undefined) {
            updateUserData.showLogosInCalendar = showLogosInCalendar;
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateUserData,
        });

        // User-Org-Settings updaten (optional)
        if (userOrgId && getMailFromOrganization !== undefined) {
            await prisma.user_organization_role.update({
                where: { id: userOrgId },
                data: {
                    hasGetMailNotification: getMailFromOrganization,
                },
            });
        }

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