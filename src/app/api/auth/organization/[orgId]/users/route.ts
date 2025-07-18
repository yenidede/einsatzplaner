import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Alle User einer Organisation
export async function GET(req: Request, { params }: { params: { orgId: string } }) {
    const users = await prisma.user.findMany({
        where: {
            user_organization_role: { some: { org_id: params.orgId } }
        },
        include: {
            user_organization_role: { include: { roles: true } }
        }
    });
    return NextResponse.json(users);
}