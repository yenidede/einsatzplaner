"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

// GET - Alle Organisationen des Users
export async function getUserOrganizationsAction() {
  const session = await checkUserSession();

  const orgs = await prisma.organization.findMany({
    where: {
      user_organization_role: { 
        some: { user_id: session.user.id } 
      }
    },
    select: {
      id: true,
      name: true,
      description: true,
      logo_url: true,
      email: true,
      phone: true,
      helper_name_singular: true,
      helper_name_plural: true,
      created_at: true,
    },
  });

  return orgs.map(org => ({
    id: org.id,
    name: org.name,
    description: org.description ?? "",
    logo_url: org.logo_url ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    helper_name_singular: org.helper_name_singular ?? "Helfer:in",
    helper_name_plural: org.helper_name_plural ?? "Helfer:innen",
    created_at: org.created_at.toISOString(),
  }));
}

// GET - Eine spezifische Organisation
export async function getOrganizationAction(orgId: string) {
  const session = await checkUserSession();

  // Check if user has access
  const membership = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
  });

  if (!membership) {
    throw new Error("Forbidden - No access to this organization");
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      user_organization_role: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstname: true,
              lastname: true,
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
      },
    },
  });

  if (!org) throw new Error("Organization not found");

  return {
    id: org.id,
    name: org.name,
    description: org.description ?? "",
    logo_url: org.logo_url ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    helper_name_singular: org.helper_name_singular ?? "Helfer:in",
    helper_name_plural: org.helper_name_plural ?? "Helfer:innen",
    created_at: org.created_at.toISOString(),
    members: org.user_organization_role.map(uor => ({
      user: uor.user,
      role: uor.role,
    })),
  };
}

// PUT - Organisation bearbeiten
export type OrganizationUpdateData = {
  id: string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  helper_name_singular?: string;
  helper_name_plural?: string;
  logo_url?: string;
};

export async function updateOrganizationAction(data: OrganizationUpdateData) {
  const session = await checkUserSession();

  // Check if user has permission
  const membership = await prisma.user_organization_role.findFirst({
    where: {
      org_id: data.id,
      user_id: session.user.id,
    },
    include: {
      role: true,
    },
  });

  if (!membership) throw new Error("Forbidden");

  const isOV = membership.role?.name === "Organisationsverwaltung" ||
               membership.role?.abbreviation === "OV" ||
               membership.role?.name === "Superadmin";

  if (!isOV) throw new Error("Insufficient permissions");

  const dataToUpdate: any = {};
  if (data.name !== undefined) dataToUpdate.name = data.name;
  if (data.description !== undefined) dataToUpdate.description = data.description;
  if (data.logo_url !== undefined) dataToUpdate.logo_url = data.logo_url;
  if (data.helper_name_singular !== undefined) dataToUpdate.helper_name_singular = data.helper_name_singular;
  if (data.helper_name_plural !== undefined) dataToUpdate.helper_name_plural = data.helper_name_plural;
  if (data.email !== undefined) dataToUpdate.email = data.email;
  if (data.phone !== undefined) dataToUpdate.phone = data.phone;

  const updated = await prisma.organization.update({
    where: { id: data.id },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      description: true,
      email: true,
      phone: true,
      logo_url: true,
      helper_name_singular: true,
      helper_name_plural: true,
    },
  });

  revalidatePath(`/organization/${data.id}`);
  revalidatePath(`/organization/${data.id}/manage`);

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? "",
    email: updated.email ?? "",
    phone: updated.phone ?? "",
    logo_url: updated.logo_url ?? "",
    helper_name_singular: updated.helper_name_singular ?? "Helfer:in",
    helper_name_plural: updated.helper_name_plural ?? "Helfer:innen",
  };
}

// DELETE - Organisation löschen
export async function deleteOrganizationAction(orgId: string) {
  const session = await checkUserSession();

  // Check if user has permission (must be Superadmin or OV)
  const membership = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
    include: {
      role: true,
    },
  });

  if (!membership) throw new Error("Forbidden");

  const isOV = membership.role?.name === "Organisationsverwaltung" ||
               membership.role?.abbreviation === "OV" ||
               membership.role?.name === "Superadmin";

  if (!isOV) throw new Error("Insufficient permissions");

  // Delete all related roles first
  await prisma.user_organization_role.deleteMany({
    where: { org_id: orgId }
  });

  // Then delete the organization
  const deletedOrg = await prisma.organization.delete({
    where: { id: orgId }
  });

  revalidatePath("/");

  return {
    message: "Organisation erfolgreich gelöscht",
    organization: deletedOrg
  };
}