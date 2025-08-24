import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/prisma";

// GET Handler für Userdaten
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
    }

    // Lade User mit allen Organisationen und Rollen
    const userWithOrganizations = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            user_organization_role: {
                include: {
                    organization: true,
                    role: true
                }
            }
        }
    });

    if (!userWithOrganizations) {
        return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    }

    // Gruppiere Rollen nach Organisation
    const organizationsWithRoles = userWithOrganizations.user_organization_role.reduce((acc: any[], curr) => {
        const existingOrg = acc.find(org => org.id === curr.organization.id);

        const roleObj = {
            id: curr.role.id,
            name: curr.role.name,
            abbreviation: (curr.role as any).abbreviation ?? null
        };
        if (existingOrg) {
            // Organisation existiert bereits, füge Rolle hinzu
            existingOrg.roles.push(roleObj);
            existingOrg.userOrgRoleIds.push(curr.id);
        } else {
            // Neue Organisation hinzufügen
            acc.push({
                id: curr.organization.id,
                name: curr.organization.name,
                description: curr.organization.description,
                roles: [roleObj],
                userOrgRoleIds: [curr.id],
                //hasGetMailNotification: curr.hasGetMailNotification || false
                });
            }
        
        return acc;
    }, []);

    // Füge die gruppierten Organisationen zum User hinzu
    const userData = {
        ...userWithOrganizations,
        organizations: organizationsWithRoles
    };

    return NextResponse.json(userData);
}

// POST Handler (für Kompatibilität)
export async function POST(req: Request) {
    return handleUserUpdate(req);
}

// DELETE Handler - User verlässt Organisation
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        const orgId = searchParams.get("orgId");
        const userOrgRoleId = searchParams.get("userOrgRoleId");

        if (!userId || (!orgId && !userOrgRoleId)) {
            return NextResponse.json({ 
                error: "userId und (orgId oder userOrgRoleId) sind erforderlich" 
            }, { status: 400 });
        }

        // UUID format validieren
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(userId)) {
            return NextResponse.json(
                { error: 'Ungültige userId Format' },
                { status: 400 }
            );
        }

        if (orgId && !uuidRegex.test(orgId)) {
            return NextResponse.json(
                { error: 'Ungültige orgId Format' },
                { status: 400 }
            );
        }

        if (userOrgRoleId && !uuidRegex.test(userOrgRoleId)) {
            return NextResponse.json(
                { error: 'Ungültige userOrgRoleId Format' },
                { status: 400 }
            );
        }

        // Prüfe ob User existiert
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                user_organization_role: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
        }

        // Prüfe ob User nur eine Organisation hat (dann darf er nicht austreten)
        if (user.user_organization_role.length <= 1) {
            return NextResponse.json({ 
                error: "Sie können die letzte Organisation nicht verlassen" 
            }, { status: 400 });
        }

        // Lösche die user_organization_role Beziehung
        let deleteCondition: any;
        if (userOrgRoleId) {
            deleteCondition = { id: userOrgRoleId };
        } else {
            deleteCondition = { 
                user_id: userId, 
                organization_id: orgId  // Korrigiert: organization_id statt org_id
            };
        }

        const deletedRelation = await prisma.user_organization_role.deleteMany({
            where: deleteCondition
        });

        if (deletedRelation.count === 0) {
            return NextResponse.json({ 
                error: "Organisation-Zuordnung nicht gefunden" 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Organisation erfolgreich verlassen",
            deletedCount: deletedRelation.count
        });

    } catch (error) {
        console.error("DELETE Error:", error);
        return NextResponse.json({ 
            error: "Fehler beim Verlassen der Organisation" 
        }, { status: 500 });
    }
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
            data: updateUserData,
        });

        // User-Org-Settings können im aktuellen Schema nicht aktualisiert werden
        // (hasGetMailNotification existiert nicht in user_organization_role)
        if (userOrgId && hasGetMailNotification !== undefined) {
            console.log("Note: hasGetMailNotification is not supported in current schema");
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