"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { hash, compare } from "bcrypt";
import { revalidatePath } from "next/cache";
import { OrganizationRole } from "@/types/next-auth";

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export type UserUpdateData = {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  currentPassword?: string;
  salutationId?: string;
  newPassword?: string;
  hasLogoinCalendar?: boolean;
};

export async function getSalutationsAction() {
  try {
    const salutations = await prisma.salutation.findMany({
      select: {
        id: true,
        salutation: true,
      },
      orderBy: { salutation: "asc" },
    });
    return salutations;
  } catch (error) {
    throw new Error("Fehler beim Laden der Anreden", { cause: error });
  }
}

export async function getUserProfileAction() {
  const session = await checkUserSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      picture_url: true,
      phone: true,
      hasLogoinCalendar: true,
      created_at: true,
      salutationId: true,
      user_organization_role: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
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

  if (!user) throw new Error("User not found");

  const organizationsMap = new Map();
  user.user_organization_role.forEach((uor) => {
    const orgId = uor.organization.id;
    if (!organizationsMap.has(orgId)) {
      organizationsMap.set(orgId, {
        id: orgId,
        name: uor.organization.name,
        roles: [],
        hasGetMailNotification: uor.hasGetMailNotification ?? true,
      });
    }

    // Add role if not yet added
    const org = organizationsMap.get(orgId);
    if (!org.roles.find((r: OrganizationRole) => r.roleId === uor.role.id)) {
      org.roles.push(uor.role);
    }
  });

  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname ?? "",
    lastname: user.lastname ?? "",
    picture_url: user.picture_url,
    salutationId: user.salutationId ?? "",
    orgIds: Array.from(organizationsMap.keys()),
    roleIds: user.user_organization_role.map((uor) => uor.role.id),
    activeOrganizationId:
      session.user.activeOrganizationId ??
      (Array.from(organizationsMap.keys())[0] || null),
    phone: user.phone ?? "",
    hasLogoinCalendar: user.hasLogoinCalendar ?? true,
    created_at: user.created_at.toISOString(),
    organizations: Array.from(organizationsMap.values()),
    hasGetMailNotification: Array.from(organizationsMap.values()).some(
      (org) => org.hasGetMailNotification
    ),
  };
}

export async function updateUserProfileAction(data: UserUpdateData) {
  const session = await checkUserSession();
  console.log("Update Data:", data);
  // Validate password if changing
  if (data.newPassword && data.currentPassword) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      throw new Error("Current password is required");
    }

    const isValid = await compare(data.currentPassword, user.password);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }
  }

  // Prepare update data
  const updateData: UserUpdateData = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstname !== undefined) updateData.firstname = data.firstname;
  if (data.lastname !== undefined) updateData.lastname = data.lastname;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.salutationId !== undefined)
    updateData.salutationId = data.salutationId;
  if (data.hasLogoinCalendar !== undefined)
    updateData.hasLogoinCalendar = data.hasLogoinCalendar;

  // Hash new password if provided
  if (data.newPassword) {
    updateData.newPassword = await hash(data.newPassword, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstname: true,
      lastname: true,
      picture_url: true,
      salutationId: true,
      phone: true,
      hasLogoinCalendar: true,
    },
  });

  revalidatePath("/settings");

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    firstname: updatedUser.firstname ?? "",
    lastname: updatedUser.lastname ?? "",
    picture_url: updatedUser.picture_url,
    phone: updatedUser.phone ?? "",
    salutationId: updatedUser.salutationId ?? "",
    hasLogoinCalendar: updatedUser.hasLogoinCalendar ?? true,
  };
}

// ✅ Update Mail Notification für Organisation
export async function updateOrgMailNotificationAction(
  organizationId: string,
  hasGetMailNotification: boolean
) {
  const session = await checkUserSession();

  // Update alle user_organization_role Einträge für diesen User + Org
  await prisma.user_organization_role.updateMany({
    where: {
      user_id: session.user.id,
      org_id: organizationId,
    },
    data: {
      hasGetMailNotification: hasGetMailNotification,
    },
  });

  revalidatePath("/settings");

  return { success: true };
}

export async function uploadProfilePictureAction(formData: FormData) {
  const session = await checkUserSession();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB");
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: { picture_url: dataUrl },
    select: { picture_url: true },
  });

  revalidatePath("/settings");

  return { picture_url: updatedUser.picture_url };
}
