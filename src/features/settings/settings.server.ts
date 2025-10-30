"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { hash, compare } from "bcrypt";
import { revalidatePath } from "next/cache";

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export type UserUpdateData = {
  email?: string;
  firstname?: string;
  lastname?: string;
  currentPassword?: string;
  newPassword?: string;
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
      created_at: true,
    },
  });

  if (!user) throw new Error("User not found");

  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname ?? "",
    lastname: user.lastname ?? "",
    picture_url: user.picture_url,
    created_at: user.created_at.toISOString(),
  };
}

export async function updateUserProfileAction(data: UserUpdateData) {
  const session = await checkUserSession();

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
  const updateData: any = {};
  if (data.email !== undefined) updateData.email = data.email;
  if (data.firstname !== undefined) updateData.firstname = data.firstname;
  if (data.lastname !== undefined) updateData.lastname = data.lastname;

  // Hash new password if provided
  if (data.newPassword) {
    updateData.password_hash = await hash(data.newPassword, 10);
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
    },
  });

  revalidatePath("/settings");

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    firstname: updatedUser.firstname ?? "",
    lastname: updatedUser.lastname ?? "",
    picture_url: updatedUser.picture_url,
  };
}

export async function uploadProfilePictureAction(formData: FormData) {
  const session = await checkUserSession();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size must be less than 5MB");
  }

  // Convert to base64
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