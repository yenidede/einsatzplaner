import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    if (invitation.expires_at < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    if (invitation.accepted) {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 400 }
      );
    }

    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "Email does not match" },
        { status: 403 }
      );
    }

    await prisma.user_organization_role.create({
      data: {
        user_id: session.user.id,
        org_id: invitation.org_id,
        role_id: invitation.role_id,
      },
    });

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        accepted: true,
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        picture_url: true,
        active_org: true,
      },
    });

    const userOrgRoles = await prisma.user_organization_role.findMany({
      where: { user_id: session.user.id },
      select: {
        org_id: true,
        role_id: true,
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
      },
    });

    const orgIds = [...new Set(userOrgRoles.map((uor) => uor.org_id))];
    const roleIds = [...new Set(userOrgRoles.map((uor) => uor.role_id))];

    let activeOrganization = null;

    if (updatedUser?.active_org) {
      const activeOrgData = userOrgRoles.find(
        (uor) => uor.org_id === updatedUser.active_org
      );
      if (activeOrgData) {
        activeOrganization = activeOrgData.organization;
      }
    }

    if (!activeOrganization) {
      activeOrganization = invitation.organization;

      await prisma.user.update({
        where: { id: session.user.id },
        data: { active_org: invitation.org_id },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      sessionUpdate: {
        user: {
          ...session.user,
          orgIds,
          roleIds,
          activeOrganization,
        },
      },
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
