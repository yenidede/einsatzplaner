"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { hash, compare } from "bcrypt";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  newPassword?: string;
  hasLogoinCalendar?: boolean;
};

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
    if (!org.roles.find((r: any) => r.id === uor.role.id)) {
      org.roles.push(uor.role);
    }
  });

  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname ?? "",
    lastname: user.lastname ?? "",
    picture_url: user.picture_url,
    phone: user.phone ?? "",
    hasLogoinCalendar: user.hasLogoinCalendar ?? true,
    created_at: user.created_at.toISOString(),
    organizations: Array.from(organizationsMap.values()),
    hasGetMailNotification: Array.from(organizationsMap.values()).some((org) => org.hasGetMailNotification), 
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

  const updateData: any = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstname !== undefined) updateData.firstname = data.firstname;
  if (data.lastname !== undefined) updateData.lastname = data.lastname;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.hasLogoinCalendar !== undefined)
    updateData.hasLogoinCalendar = data.hasLogoinCalendar;

  if (data.newPassword) {
    updateData.password = await hash(data.newPassword, 10);
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
// TODO (Ömer): Correct Implementation of Uploading Profile Picture to Supabase Storage
export async function uploadProfilePictureAction(formData: FormData) {
  const session = await checkUserSession();

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const filename = `${session.user.id}.${ext}`;
  const filePath = `users/${session.user.id}/${filename}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("logos")
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = await supabaseAdmin.storage
    .from("logos")
    .getPublicUrl(filePath);

  let publicUrl = (urlData as any)?.publicUrl as string | undefined;
  if (!publicUrl) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set");
    publicUrl = `${base}/storage/v1/object/public/logos/${encodeURIComponent(filePath)}`;
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: { picture_url: publicUrl },
    select: { picture_url: true },
  });

  revalidatePath("/settings");
  return { picture_url: updatedUser.picture_url };
}