import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { orgId: string } }) {
    try {
        const { orgId } = params;

        const userOrgRoles = await prisma.user_organization_role.findMany({
            where: { org_id: orgId },
            include: {
                user: {
                    select: { 
                        id: true, 
                        email: true, 
                        firstname: true, 
                        lastname: true,
                        picture_url: true 
                    }
                },
                role: {
                    select: { 
                        id: true, 
                        name: true, 
                        abbreviation: true 
                    }
                }
            },
            orderBy: {
                user: {
                    firstname: 'asc'
                }
            }
        });

        return NextResponse.json(userOrgRoles);
    } catch (error) {
        console.error("Fehler beim Laden der User:", error);
        return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
    }
}