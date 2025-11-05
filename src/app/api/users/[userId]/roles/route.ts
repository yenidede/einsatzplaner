import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - Hole alle Rollen eines Users in einer Organisation
export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');
        
        if (!orgId) {
            return NextResponse.json({ error: 'orgId fehlt' }, { status: 400 });
        }

        const { userId } = params;

        const userRoles = await prisma.user_organization_role.findMany({
            where: {
                user_id: userId,
                org_id: orgId
            },
            include: {
                role: true
            }
        });

        return NextResponse.json({
            roles: userRoles.map(ur => ({
                id: ur.role.id,
                name: ur.role.name,
                abbreviation: ur.role.abbreviation
            }))
        });

    } catch (error) {
        console.error('Error fetching user roles:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Füge Rolle zu User hinzu
export async function POST(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = params;
        const { orgId, roleAbbreviation } = await request.json();

        if (!orgId || !roleAbbreviation) {
            return NextResponse.json({ error: 'orgId und roleAbbreviation erforderlich' }, { status: 400 });
        }

        // Finde die Rolle
        const role = await prisma.role.findFirst({
            where: { abbreviation: roleAbbreviation }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Prüfe ob User-Role bereits existiert
        const existingRole = await prisma.user_organization_role.findFirst({
            where: {
                user_id: userId,
                org_id: orgId,
                role_id: role.id
            }
        });

        if (existingRole) {
            return NextResponse.json({ error: 'Role already assigned' }, { status: 409 });
        }

        // Erstelle neue User-Role
        await prisma.user_organization_role.create({
            data: {
                user_id: userId,
                org_id: orgId,
                role_id: role.id
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error adding user role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Entferne Rolle von User
export async function DELETE(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = params;
        const { orgId, roleAbbreviation } = await request.json();

        if (!orgId || !roleAbbreviation) {
            return NextResponse.json({ error: 'orgId und roleAbbreviation erforderlich' }, { status: 400 });
        }

        // Finde die Rolle
        const role = await prisma.role.findFirst({
            where: { abbreviation: roleAbbreviation }
        });

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        // Lösche User-Role
        await prisma.user_organization_role.deleteMany({
            where: {
                user_id: userId,
                org_id: orgId,
                role_id: role.id
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error removing user role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}