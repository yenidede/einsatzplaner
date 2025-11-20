"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import prisma from "@/lib/prisma";
import { hash, compare } from "bcrypt";
import { revalidatePath } from "next/cache";
import { OrganizationRole } from "@/types/next-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl) {
  throw new Error("Environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
}
if (!supabaseServiceRoleKey) {
  throw new Error("Environment variable SUPABASE_SERVICE_ROLE_KEY is not set.");
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
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

export async function getOneSalutationAction(salutationId: string) {
  try {
    const salutation = await prisma.salutation.findUnique({
      where: { id: salutationId },
      select: {
        id: true,
        salutation: true,
      },
    });
    if (!salutation) throw new Error("Anrede nicht gefunden");
    return salutation;
  } catch (error) {
    throw new Error("Fehler beim Laden der Anrede", { cause: error });
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
      active_org: true, // ✅ Load active_org
      user_organization_role: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              logo_url: true, // ✅ Load logo
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
        logo_url: uor.organization.logo_url, // ✅ Include logo
        roles: [],
        hasGetMailNotification: uor.hasGetMailNotification ?? true,
      });
    }

    const org = organizationsMap.get(orgId);
    if (!org.roles.find((r: OrganizationRole) => r.roleId === uor.role.id)) {
      org.roles.push(uor.role);
    }
  });

  // ✅ Find activeOrganization OBJECT
  const activeOrgId =
    user.active_org || Array.from(organizationsMap.keys())[0] || null;
  const activeOrgData = activeOrgId ? organizationsMap.get(activeOrgId) : null;

  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname ?? "",
    lastname: user.lastname ?? "",
    picture_url: user.picture_url,
    salutationId: user.salutationId ?? "",
    orgIds: Array.from(organizationsMap.keys()),
    roleIds: user.user_organization_role.map((uor) => uor.role.id),
    // ✅ activeOrganization als OBJECT
    activeOrganization: activeOrgData
      ? {
        id: activeOrgData.id,
        name: activeOrgData.name,
        logo_url: activeOrgData.logo_url,
      }
      : null,
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

  const updateData: UserUpdateData = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstname !== undefined) updateData.firstname = data.firstname;
  if (data.lastname !== undefined) updateData.lastname = data.lastname;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.salutationId !== undefined)
    updateData.salutationId = data.salutationId;
  if (data.hasLogoinCalendar !== undefined)
    updateData.hasLogoinCalendar = data.hasLogoinCalendar;

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

export async function updateOrgMailNotificationAction(
  organizationId: string,
  hasGetMailNotification: boolean
) {
  const session = await checkUserSession();

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

  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);
  const extension = file.name.split(".").pop() || "jpg";
  const filePath = `users/${session.user.id}/${session.user.id}.${extension}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("logos")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { picture_url: publicUrl },
  });

  revalidatePath("/settings");

  return { picture_url: publicUrl };
}

export async function updateActiveOrganizationAction(
  organizationId: string
): Promise<{
  success: boolean;
  error?: string;
  organization?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}> {
  try {
    const session = await checkUserSession();

    const hasAccess = await prisma.user_organization_role.findFirst({
      where: {
        user_id: session.user.id,
        org_id: organizationId,
      },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
      },
    });

    if (!hasAccess) {
      return { success: false, error: "Kein Zugriff auf diese Organisation" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { active_org: organizationId },
    });

    revalidatePath("/");

    return {
      success: true,
      organization: {
        id: hasAccess.organization.id,
        name: hasAccess.organization.name,
        logo_url: hasAccess.organization.logo_url,
      },
    };
  } catch (error) {
    console.error("Failed to update active organization:", error);
    return { success: false, error: "Fehler beim Aktualisieren" };
  }
}
