import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Alle Organisationen des Users
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const id = searchParams.get("id");

    // Wenn eine spezifische Organisation angefragt wird
    if (id) {
        const org = await prisma.organization.findUnique({
            where: { id },
            include: {
                user_organization_role: {
                    include: {
                        user: true,
                        role: true
                    }
                }
            }
        });
        return NextResponse.json(org);
    }

    // Alle Organisationen des Users
    if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
    const orgs = await prisma.organization.findMany({
        where: {
            user_organization_role: { some: { user_id: userId } }
        }
    });
    return NextResponse.json(orgs);
}

// Organisation bearbeiten
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, logo_url, email, phone } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (typeof name !== "undefined") dataToUpdate.name = name;
    if (typeof description !== "undefined") dataToUpdate.description = description;
    if (typeof logo_url !== "undefined") dataToUpdate.logo_url = logo_url;
    // Passe Keys an dein Schema an, z.B. mail / telefon falls benötigt
    if (typeof email !== "undefined") dataToUpdate.email = email;
    if (typeof phone !== "undefined") dataToUpdate.phone = phone;

    const updated = await prisma.organization.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Organisation update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Organisation ID fehlt" }, { status: 400 });
        }

        // Lösche zuerst alle zugehörigen Rollen
        await prisma.user_organization_role.deleteMany({
            where: { org_id: id }
        });

        // Dann lösche die Organisation
        const deletedOrg = await prisma.organization.delete({
            where: { id }
        });

        return NextResponse.json({ 
            message: "Organisation erfolgreich gelöscht", 
            organization: deletedOrg 
        });

    } catch (error) {
        console.error("Fehler beim Löschen der Organisation:", error);
        return NextResponse.json(
            { error: "Fehler beim Löschen der Organisation" }, 
            { status: 500 }
        );
    }
}