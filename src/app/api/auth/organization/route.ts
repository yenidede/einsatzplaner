import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Alle Organisationen des Users
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

    const orgs = await prisma.organization.findMany({
        where: {
            user_organization_role: { some: { user_id: userId } }
        }
    });
    return NextResponse.json(orgs);
}

// Organisation bearbeiten
export async function PUT(req: Request) {
    const { id, name, description } = await req.json();
    const org = await prisma.organization.update({
        where: { id },
        data: { name, description }
    });
    return NextResponse.json(org);
}