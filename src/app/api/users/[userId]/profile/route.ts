import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        user_organization_role: {
          where: { org_id: orgId },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                abbreviation: true
              }
            }
          }
        }
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orgRole = userProfile.user_organization_role[0];
    if (!orgRole) {
      return NextResponse.json({ error: "User not in organization" }, { status: 404 });
    }

    const response = {
      id: userProfile.id,
      email: userProfile.email,
      firstname: userProfile.firstname,
      lastname: userProfile.lastname,
      phone: userProfile.phone,
      picture_url: userProfile.picture_url,
      description: userProfile.description,
      hasLogoinCalendar: userProfile.hasLogoinCalendar,
      created_at: userProfile.created_at,
      last_login: userProfile.last_login,
      role: orgRole.role,
      hasGetMailNotification: orgRole.hasGetMailNotification,
      joined_at: orgRole.created_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstname,
      lastname,
      email,
      phone,
      description,
      hasLogoinCalendar,
      hasGetMailNotification,
      organizationId
    } = body;

    // Update user basic info
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: {
        firstname,
        lastname,
        email,
        phone,
        description,
        hasLogoinCalendar,
        updated_at: new Date()
      }
    });

    // Update organization-specific settings
    if (organizationId && hasGetMailNotification !== undefined) {
      await prisma.user_organization_role.updateMany({
        where: {
          user_id: params.userId,
          org_id: organizationId
        },
        data: {
          hasGetMailNotification
        }
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}