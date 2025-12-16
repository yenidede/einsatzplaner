"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { OrganizationForPDF } from "@/features/organization/types";
import { hasPermission } from "@/lib/auth/authGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase environment variables are not set");
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}
export async function getAllRolesExceptSuperAdmin() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      abbreviation: true,
    },
    orderBy: {
      name: "asc",
    },
    where: {
      name: { not: "Superadmin" },
    },
  });

  return roles;
}
export async function getOrganizationById(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
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
  };
}
export async function getEinsatzNamesByOrgId(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      einsatz_name_singular: true,
      einsatz_name_plural: true,
    },
  });
  if (!org) throw new Error("Organization not found");

  return {
    einsatz_name_singular: org.einsatz_name_singular ?? "Einsatz",
    einsatz_name_plural: org.einsatz_name_plural ?? "Einsätze",
  };
} // GET - Alle Organisationen des Users
export async function getUserOrganizationsAction() {
  const session = await checkUserSession();

  const orgs = await prisma.organization.findMany({
    where: {
      user_organization_role: {
        some: { user_id: session.user.id },
      },
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

  return orgs.map((org) => ({
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
export async function getUserOrganizationByIdAction(orgId: string) {
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
    members: org.user_organization_role.map((uor) => ({
      user: {
        ...uor.user,
        picture_url: uor.user.picture_url, // Map für Kompatibilität
      },
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
  const userOrgRole = await prisma.user_organization_role.findFirst({
    where: {
      org_id: data.id,
      user_id: session.user.id,
    },
    include: {
      role: true,
    },
  });

  if (!userOrgRole) throw new Error("Forbidden");

  if (!await hasPermission(session, "organization:update"))
    throw new Error("Insufficient permissions");

  const dataToUpdate: Partial<OrganizationUpdateData> = {};
  if (data.name !== undefined) dataToUpdate.name = data.name;
  if (data.description !== undefined)
    dataToUpdate.description = data.description;
  if (data.logo_url !== undefined) dataToUpdate.logo_url = data.logo_url;
  if (data.helper_name_singular !== undefined)
    dataToUpdate.helper_name_singular = data.helper_name_singular;
  if (data.helper_name_plural !== undefined)
    dataToUpdate.helper_name_plural = data.helper_name_plural;
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
  const userOrgRole = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
    include: {
      role: true,
    },
  });

  if (!userOrgRole) throw new Error("Forbidden");

  const isOV =
    userOrgRole.role?.name === "Organisationsverwaltung" ||
    userOrgRole.role?.abbreviation === "OV" ||
    userOrgRole.role?.name === "Superadmin";

  if (!isOV) throw new Error("Insufficient permissions");

  // Delete all related roles first
  await prisma.user_organization_role.deleteMany({
    where: { org_id: orgId },
  });

  // Then delete the organization
  const deletedOrg = await prisma.organization.delete({
    where: { id: orgId },
  });

  revalidatePath("/");

  return {
    message: "Organisation erfolgreich gelöscht",
    organization: deletedOrg,
  };
}

// TODO (Ömer): Correct Implementation of Uploading Organization Logo to Supabase Storage
export async function uploadOrganizationLogoAction(formData: FormData) {
  try {
    const session = await checkUserSession();

    const orgId = formData.get("orgId") as string;
    const file = formData.get("logo") as File;

    if (!file || !orgId) throw new Error("Missing file or orgId");

    // Check permission
    const userOrgRole = await prisma.user_organization_role.findFirst({
      where: {
        org_id: orgId,
        user_id: session.user.id,
      },
      include: { role: true },
    });

    if (!userOrgRole) throw new Error("Forbidden");

    if (!hasPermission(session, "organization:update"))
      throw new Error("Insufficient permissions");

    // Validate file
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be less than 5MB");
    }

    // Upload to Supabase Storage

    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${orgId}.${fileExt}`;
    const filePath = `organizations/${fileName}`;

    const buffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } =
      await supabaseServer.storage.from("logos").upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseServer.storage
      .from("logos")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Delete old logo if exists
    const oldOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { logo_url: true },
    });

    if (oldOrg?.logo_url && oldOrg.logo_url.includes("supabase")) {
      const oldPath = oldOrg.logo_url.split("/logos/")[1];
      if (oldPath) {
        await supabaseServer.storage.from("logos").remove([oldPath]);
      }
    }

    // Update organization with new URL
    await prisma.organization.update({
      where: { id: orgId },
      data: { logo_url: publicUrl },
    });

    revalidatePath(`/organization/${orgId}/manage`);

    return { url: publicUrl };
  } catch (error) {
    console.error("uploadOrganizationLogoAction error:", error);
    throw error;
  }
}

export async function getOrganizationWithRelations(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      organization_address: {
        orderBy: { created_at: "desc" },
      },
      organization_bank_account: {
        orderBy: { created_at: "desc" },
      },
      organization_details: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!org) throw new Error("Organization not found");

  return org;
}

export async function getOrganizationForPDF(
  orgId: string
): Promise<OrganizationForPDF> {
  const org = await getOrganizationWithRelations(orgId);

  const addresses = (org.organization_address || []).map((addr) => ({
    label: addr.label,
    street: addr.street,
    postal_code: addr.postal_code,
    city: addr.city,
    country: addr.country,
  }));

  const bankAccounts = (org.organization_bank_account || []).map((bank) => ({
    bank_name: bank.bank_name,
    iban: bank.iban,
    bic: bank.bic,
  }));

  const details = org.organization_details?.[0];

  return {
    id: org.id,
    name: org.name,
    logo_url: org.logo_url,
    email: org.email,
    phone: org.phone,
    addresses,
    bankAccounts,

    details: details
      ? {
          website: details.website,
          vat: details.vat,
          zvr: details.zvr,
          authority: details.authority,
        }
      : null,
  };
}
