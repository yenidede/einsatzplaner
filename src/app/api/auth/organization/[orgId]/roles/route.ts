import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Rollen einer Organisation
export async function GET(req: Request, { params }: { params: { orgId: string } }) {
    const roles = await prisma.roles.findMany({
        where: { user_organization_role: { some: { org_id: params.orgId } } }
    });
    return NextResponse.json(roles);
}