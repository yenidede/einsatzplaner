import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";
import { getRolePermissions } from "@/config/permissions";
import type { AuthUser, OrganizationUser, RoleName } from "@/types/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load user with organizations and roles
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        user_organization_role: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                helper_name_singular: true,
                helper_name_plural: true,
                einsatz_name_singular: true,
                einsatz_name_plural: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Transform to clean structure
    const organizations: OrganizationUser[] = user.user_organization_role.map(
      (uor) => ({
        organizationId: uor.organization.id,
        organization: {
          id: uor.organization.id,
          name: uor.organization.name,
          helper_name_singular: uor.organization.helper_name_singular,
          helper_name_plural: uor.organization.helper_name_plural,
          einsatz_name_singular: uor.organization.einsatz_name_singular,
          einsatz_name_plural: uor.organization.einsatz_name_plural,
        },
        role: uor.role.name as RoleName,
        roleId: uor.role.id,
        roleAbbreviation: uor.role.abbreviation,
        permissions: getRolePermissions(uor.role.name as RoleName),
      })
    );

    // Primary/default organization (first one)
    const primaryOrganization = organizations[0] || null;

    const userData: AuthUser = {
      // User data
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      picture_url: user.picture_url,

      // Current context
      currentOrgId: primaryOrganization?.organizationId || null,
      currentRole: primaryOrganization?.role || null,
      currentOrganization: primaryOrganization?.organization || null,

      // All organizations
      organizations,

      // All roles across all organizations
      allRoles: [...new Set(organizations.map((org) => org.role))], // Unique roles
      allRoleIds: organizations.map((org) => org.roleId),
      allPermissions: [
        ...new Set(organizations.flatMap((org) => org.permissions)),
      ], // Unique permissions
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
