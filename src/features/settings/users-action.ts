"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/auth/authGuard";

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function getUserProfileAction(userId: string, orgId: string) {
  const session = await checkUserSession();

  const requestingUserAccess = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
  });

  if (!requestingUserAccess) throw new Error("Forbidden");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      phone: true,
      picture_url: true,
      salutationId: true,
      description: true,
      user_organization_role: {
        where: { org_id: orgId },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              helper_name_singular: true,
              helper_name_plural: true,
            },
          },
        },
      },
    },
  });

  if (!user) throw new Error("User not found");

  const userOrgRole = user.user_organization_role[0];

  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname ?? "",
    lastname: user.lastname ?? "",
    phone: user.phone,
    picture_url: user.picture_url,
    description: user.description,
    hasLogoinCalendar: false,
    hasGetMailNotification: false,
    salutationId: user.salutationId ?? "",
    role: userOrgRole?.role
      ? {
          id: userOrgRole.role.id,
          name: userOrgRole.role.name,
          abbreviation: userOrgRole.role.abbreviation ?? "",
        }
      : null,
    organization: userOrgRole?.organization
      ? {
          id: userOrgRole.organization.id,
          name: userOrgRole.organization.name,
          helper_name_singular:
            userOrgRole.organization.helper_name_singular ?? "Helfer:in",
          helper_name_plural:
            userOrgRole.organization.helper_name_plural ?? "Helfer:innen",
        }
      : null,
  };
}

export async function getUserOrgRolesAction(orgId: string, userId: string) {
  await checkUserSession();

  const userRoles = await prisma.user_organization_role.findMany({
    where: {
      org_id: orgId,
      user_id: userId,
    },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
        },
      },
    },
  });

  return userRoles.map((ur) => ({
    id: ur.id,
    role: {
      id: ur.role.id,
      name: ur.role.name,
      abbreviation: ur.role.abbreviation ?? "",
    },
  }));
}

export async function getAllUserOrgRolesAction(orgId: string) {
  await checkUserSession();

  const userRoles = await prisma.user_organization_role.findMany({
    where: {
      org_id: orgId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstname: true,
          lastname: true,
          phone: true,
          picture_url: true,
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
  });

  return userRoles.map((ur) => ({
    user: {
      id: ur.user.id,
      email: ur.user.email,
      firstname: ur.user.firstname ?? "",
      lastname: ur.user.lastname ?? "",
      phone: ur.user.phone,
      picture_url: ur.user.picture_url,
    },
    role: {
      id: ur.role.id,
      name: ur.role.name,
      abbreviation: ur.role.abbreviation ?? "",
    },
  }));
}

export async function updateUserRoleAction(
  userId: string,
  organizationId: string,
  roleAbbreviation: string,
  action: "add" | "remove"
) {
  const session = await checkUserSession();

  const requestingUserRole = await prisma.user_organization_role.findMany({
    where: {
      org_id: organizationId,
      user_id: session.user.id,
    },
    include: { role: true },
  });

  if (!requestingUserRole) throw new Error("Forbidden");
  const isPermitted =
    requestingUserRole.some(
      (role) => role.role?.name === "Organisationsverwaltung"
    ) ||
    requestingUserRole.some((role) => role.role?.abbreviation === "OV") ||
    requestingUserRole.some((role) => role.role?.name === "Superadmin");

  if (!isPermitted) throw new Error("Insufficient permissions");

  const role = await prisma.role.findFirst({
    where: {
      OR: [{ abbreviation: roleAbbreviation }, { name: roleAbbreviation }],
    },
  });

  if (!role) throw new Error(`Role ${roleAbbreviation} not found`);

  if (action === "add") {
    const existing = await prisma.user_organization_role.findFirst({
      where: {
        user_id: userId,
        org_id: organizationId,
        role_id: role.id,
      },
    });

    if (existing) {
      return { message: "Role already assigned" };
    }

    await prisma.user_organization_role.create({
      data: {
        user_id: userId,
        org_id: organizationId,
        role_id: role.id,
      },
    });
  } else if (action === "remove") {
    await prisma.user_organization_role.deleteMany({
      where: {
        user_id: userId,
        org_id: organizationId,
        role_id: role.id,
      },
    });
  }

  revalidatePath(`/organization/${organizationId}`);

  return { message: "Role updated successfully" };
}

export async function removeUserFromOrganizationAction(
  userId: string,
  organizationId: string
) {
  const session = await checkUserSession();

  const requestingUserRoles = await prisma.user_organization_role.findMany({
    where: {
      org_id: organizationId,
      user_id: session.user.id,
    },
    include: { role: true },
  });

  if (!requestingUserRoles || requestingUserRoles.length === 0) {
    throw new Error("Forbidden");
  }

  const isSuperadmin = requestingUserRoles.some(
    (role) => role.role?.name === "Superadmin"
  );
  const isOV = requestingUserRoles.some(
    (role) =>
      role.role?.name === "Organisationsverwaltung" ||
      role.role?.abbreviation === "OV"
  );

  const targetUserRoles = await prisma.user_organization_role.findMany({
    where: {
      user_id: userId,
      org_id: organizationId,
    },
    include: { role: true },
  });

  const targetIsSuperadmin = targetUserRoles.some(
    (role) => role.role?.name === "Superadmin"
  );

  if (targetIsSuperadmin && !isSuperadmin) {
    throw new Error(
      "Nur Superadmins können andere Superadmins aus der Organisation entfernen"
    );
  }
  if (!isOV && !isSuperadmin) {
    throw new Error("Keine Berechtigung zum Entfernen von Benutzern");
  }

  await prisma.user_organization_role.deleteMany({
    where: {
      user_id: userId,
      org_id: organizationId,
    },
  });

  revalidatePath(`/organization/${organizationId}`);

  return { message: "User removed from organization" };
}

export async function promoteToSuperadminAction(
  userId: string,
  organizationId: string
) {
  const session = await checkUserSession();

  const requestingUserRoles = await prisma.user_organization_role.findMany({
    where: {
      org_id: organizationId,
      user_id: session.user.id,
    },
    include: { role: true },
  });

  const isSuperadmin = requestingUserRoles.some(
    (role) => role.role?.name === "Superadmin"
  );

  if (!isSuperadmin) {
    throw new Error(
      "Nur Superadmins können andere Benutzer zu Superadmins ernennen"
    );
  }

  const superadminRole = await prisma.role.findFirst({
    where: { name: "Superadmin" },
  });

  if (!superadminRole) {
    throw new Error("Superadmin-Rolle nicht gefunden");
  }
  const existingSuperadmin = await prisma.user_organization_role.findFirst({
    where: {
      user_id: userId,
      org_id: organizationId,
      role_id: superadminRole.id,
    },
  });

  if (existingSuperadmin) {
    throw new Error("Benutzer ist bereits Superadmin");
  }
  await prisma.user_organization_role.create({
    data: {
      user_id: userId,
      org_id: organizationId,
      role_id: superadminRole.id,
    },
  });

  revalidatePath(`/organization/${organizationId}`);

  return { message: "Benutzer erfolgreich zum Superadmin ernannt" };
}

export async function demoteFromSuperadminAction(
  userId: string,
  organizationId: string
) {
  const session = await checkUserSession();

  const requestingUserRoles = await prisma.user_organization_role.findMany({
    where: {
      org_id: organizationId,
      user_id: session.user.id,
    },
    include: { role: true },
  });

  const isSuperadmin = requestingUserRoles.some(
    (role) => role.role?.name === "Superadmin"
  );

  if (!isSuperadmin) {
    throw new Error("Nur Superadmins können andere Superadmins degradieren");
  }

  if (userId === session.user.id) {
    throw new Error("Sie können sich nicht selbst degradieren");
  }

  const superadminRole = await prisma.role.findFirst({
    where: { name: "Superadmin" },
  });

  if (!superadminRole) {
    throw new Error("Superadmin-Rolle nicht gefunden");
  }

  await prisma.user_organization_role.deleteMany({
    where: {
      user_id: userId,
      org_id: organizationId,
      role_id: superadminRole.id,
    },
  });

  revalidatePath(`/organization/${organizationId}`);

  return { message: "Superadmin-Rolle erfolgreich entfernt" };
}
