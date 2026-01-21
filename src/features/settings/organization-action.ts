'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { OrganizationForPDF } from '@/features/organization/types';
import { hasPermission } from '@/lib/auth/authGuard';
import { BadRequestError } from '@/lib/errors';
import { getAllRoles } from '../roles/roles-dal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are not set');
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}
export async function getAllRolesExceptSuperAdmin() {
  const roles = await getAllRoles();

  return roles.filter((role) => role.name !== 'Superadmin');
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
      max_participants_per_helper: true,
      helper_name_singular: true,
      helper_name_plural: true,
      created_at: true,
    },
  });

  if (!org) throw new Error('Organization not found');

  return {
    id: org.id,
    name: org.name,
    description: org.description ?? '',
    logo_url: org.logo_url ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    max_participants_per_helper: org.max_participants_per_helper,
    helper_name_singular: org.helper_name_singular ?? 'Helfer:in',
    helper_name_plural: org.helper_name_plural ?? 'Helfer:innen',
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
  if (!org) throw new Error('Organization not found');

  return {
    einsatz_name_singular: org.einsatz_name_singular ?? 'Einsatz',
    einsatz_name_plural: org.einsatz_name_plural ?? 'Einsätze',
  };
}
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
      max_participants_per_helper: true,
      helper_name_singular: true,
      helper_name_plural: true,
      created_at: true,
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description ?? '',
    logo_url: org.logo_url ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    max_participants_per_helper: org.max_participants_per_helper,
    helper_name_singular: org.helper_name_singular ?? 'Helfer:in',
    helper_name_plural: org.helper_name_plural ?? 'Helfer:innen',
    created_at: org.created_at.toISOString(),
  }));
}
export async function getUserOrganizationByIdAction(orgId: string | undefined) {
  if (!orgId) throw new Error('Organization ID is required');

  const session = await checkUserSession();

  const membership = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
  });

  if (!membership) {
    throw new Error('Forbidden - No access to this organization');
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

  if (!org) throw new Error('Organization not found');

  return {
    id: org.id,
    name: org.name,
    description: org.description ?? '',
    logo_url: org.logo_url ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    helper_name_singular: org.helper_name_singular ?? 'Helfer:in',
    helper_name_plural: org.helper_name_plural ?? 'Helfer:innen',
    einsatz_name_singular: org.einsatz_name_singular ?? 'Einsatz',
    einsatz_name_plural: org.einsatz_name_plural ?? 'Einsätze',
    created_at: org.created_at.toISOString(),
    max_participants_per_helper: org.max_participants_per_helper,
    members: org.user_organization_role.map((uor) => ({
      user: {
        ...uor.user,
        picture_url: uor.user.picture_url,
      },
      role: uor.role,
    })),
    allow_self_sign_out: org.allow_self_sign_out,
  };
}

export type OrganizationUpdateData = {
  id: string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  max_participants_per_helper?: number;
  helper_name_singular?: string;
  helper_name_plural?: string;
  einsatz_name_singular?: string;
  einsatz_name_plural?: string;
  logo_url?: string;
  allow_self_sign_out?: boolean;
};

export async function updateOrganizationAction(data: OrganizationUpdateData) {
  const session = await checkUserSession();

  const userOrgRole = await prisma.user_organization_role.findFirst({
    where: {
      org_id: data.id,
      user_id: session.user.id,
    },
    include: {
      role: true,
    },
  });

  if (!userOrgRole) throw new Error('Forbidden');

  if (!(await hasPermission(session, 'organization:update')))
    throw new Error('Insufficient permissions');

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
  if (data.einsatz_name_singular !== undefined)
    dataToUpdate.einsatz_name_singular = data.einsatz_name_singular;
  if (data.einsatz_name_plural !== undefined)
    dataToUpdate.einsatz_name_plural = data.einsatz_name_plural;
  if (data.max_participants_per_helper !== undefined) {
    const value = Number(data.max_participants_per_helper);
    if (!Number.isInteger(value) || value < 0 || value > 32767) {
      throw new BadRequestError(
        `Die maximale Anzahl an Teilnehmern pro ${data.helper_name_singular ?? 'Helfer:in'} darf keine negative Zahl enthalten.`
      );
    }
    dataToUpdate.max_participants_per_helper = value;
  }
  if (data.allow_self_sign_out !== undefined)
    dataToUpdate.allow_self_sign_out = data.allow_self_sign_out;

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
      max_participants_per_helper: true,
      helper_name_singular: true,
      helper_name_plural: true,
      einsatz_name_singular: true,
      einsatz_name_plural: true,
      allow_self_sign_out: true,
    },
  });

  revalidatePath(`/organization/${data.id}`);
  revalidatePath(`/organization/${data.id}/manage`);

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? '',
    email: updated.email ?? '',
    phone: updated.phone ?? '',
    logo_url: updated.logo_url ?? '',
    max_participants_per_helper: updated.max_participants_per_helper,
    helper_name_singular: updated.helper_name_singular ?? 'Helfer:in',
    helper_name_plural: updated.helper_name_plural ?? 'Helfer:innen',
  };
}

export async function deleteOrganizationAction(orgId: string) {
  const session = await checkUserSession();

  const userOrgRole = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
    include: {
      role: true,
    },
  });

  if (!userOrgRole) throw new Error('Forbidden');

  const isOV =
    userOrgRole.role?.name === 'Organisationsverwaltung' ||
    userOrgRole.role?.abbreviation === 'OV' ||
    userOrgRole.role?.name === 'Superadmin';

  if (!isOV) throw new Error('Insufficient permissions');

  await prisma.user_organization_role.deleteMany({
    where: { org_id: orgId },
  });

  const deletedOrg = await prisma.organization.delete({
    where: { id: orgId },
  });

  revalidatePath('/');

  return {
    message: 'Organisation erfolgreich gelöscht',
    organization: deletedOrg,
  };
}

export async function uploadOrganizationLogoAction(formData: FormData) {
  try {
    const session = await checkUserSession();

    const orgId = formData.get('orgId') as string;
    const file = formData.get('logo') as File;

    if (!file || !orgId) throw new Error('Missing file or orgId');

    const userOrgRole = await prisma.user_organization_role.findFirst({
      where: {
        org_id: orgId,
        user_id: session.user.id,
      },
      include: { role: true },
    });

    if (!userOrgRole) throw new Error('Forbidden');

    if (!(await hasPermission(session, 'organization:update')))
      throw new Error('Insufficient permissions');

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const oldOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { logo_url: true },
    });

    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${orgId}.${fileExt}`;
    const filePath = `organizations/${orgId}/${fileName}`;

    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from('logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseServer.storage
      .from('logos')
      .getPublicUrl(filePath);

    const publicUrl = `${urlData.publicUrl}?t=${timestamp}`;

    await prisma.organization.update({
      where: { id: orgId },
      data: { logo_url: publicUrl },
    });

    if (oldOrg?.logo_url && oldOrg.logo_url.includes('supabase')) {
      try {
        const urlParts = oldOrg.logo_url.split('/logos/');
        if (urlParts[1]) {
          const oldPathWithParams = urlParts[1];
          const oldPath = oldPathWithParams.split('?')[0];

          if (
            oldPath !== filePath &&
            oldPath.startsWith(`organizations/${orgId}/`)
          ) {
            const { error: deleteError } = await supabaseServer.storage
              .from('logos')
              .remove([oldPath]);

            if (deleteError) {
              console.warn('Failed to delete old logo:', deleteError);
            }
          }
        }
      } catch (error) {
        console.warn('Error while deleting old logo:', error);
      }
    }

    revalidatePath(`/organization/${orgId}/manage`);

    return { url: publicUrl };
  } catch (error) {
    console.error('uploadOrganizationLogoAction error:', error);
    throw error;
  }
}
export async function removeOrganizationLogoAction(orgId: string) {
  const session = await checkUserSession();

  const userOrgRole = await prisma.user_organization_role.findFirst({
    where: {
      org_id: orgId,
      user_id: session.user.id,
    },
    include: { role: true },
  });
  if (!userOrgRole) throw new Error('Forbidden');

  if (!(await hasPermission(session, 'organization:update')))
    throw new Error('Insufficient permissions');
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { logo_url: true },
  });
  if (!org) throw new Error('Organization not found');

  if (org.logo_url && org.logo_url.includes('supabase')) {
    try {
      const urlParts = org.logo_url.split('/logos/');
      if (urlParts[1]) {
        const pathWithParams = urlParts[1];
        const path = pathWithParams.split('?')[0];
        const { error: deleteError } = await supabaseServer.storage
          .from('logos')
          .remove([path]);
        if (deleteError) {
          console.warn('Failed to delete logo from storage:', deleteError);
        }
      }
    } catch (error) {
      console.warn('Error while deleting logo from storage:', error);
    }
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { logo_url: null },
  });
  revalidatePath(`/organization/${orgId}/manage`);
  return { message: 'Logo erfolgreich entfernt' };
}

export async function getOrganizationWithRelations(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      organization_address: {
        orderBy: { created_at: 'desc' },
      },
      organization_bank_account: {
        orderBy: { created_at: 'desc' },
      },
      organization_details: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!org) throw new Error('Organization not found');

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

//#region ADRESSEN

export async function getOrganizationAddressesAction(orgId: string) {
  try {
    const addresses = await prisma.organization_address.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });
    return addresses;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw new Error('Fehler beim Laden der Adressen');
  }
}

export async function createOrganizationAddressAction(data: {
  orgId: string;
  label?: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}) {
  try {
    const address = await prisma.organization_address.create({
      data: {
        org_id: data.orgId,
        label: data.label,
        street: data.street,
        postal_code: data.postal_code,
        city: data.city,
        country: data.country,
      },
    });

    revalidatePath(`/organization/${data.orgId}/manage`);
    return { success: true, address };
  } catch (error) {
    console.error('Error creating address:', error);
    throw new Error('Fehler beim Erstellen der Adresse');
  }
}

export async function updateOrganizationAddressAction(data: {
  id: string;
  orgId: string;
  label?: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}) {
  try {
    const address = await prisma.organization_address.update({
      where: { id: data.id },
      data: {
        label: data.label,
        street: data.street,
        postal_code: data.postal_code,
        city: data.city,
        country: data.country,
      },
    });

    revalidatePath(`/organization/${data.orgId}/manage`);
    return { success: true, address };
  } catch (error) {
    console.error('Error updating address:', error);
    throw new Error('Fehler beim Aktualisieren der Adresse');
  }
}

export async function deleteOrganizationAddressAction(
  id: string,
  orgId: string
) {
  try {
    await prisma.organization_address.delete({
      where: { id },
    });

    revalidatePath(`/organization/${orgId}/manage`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting address:', error);
    throw new Error('Fehler beim Löschen der Adresse');
  }
}
//#endregion
//#region BANKKONTEN

export async function getOrganizationBankAccountsAction(orgId: string) {
  try {
    const accounts = await prisma.organization_bank_account.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
    });
    return accounts;
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    throw new Error('Fehler beim Laden der Bankkonten');
  }
}

export async function createOrganizationBankAccountAction(data: {
  orgId: string;
  bank_name: string;
  iban: string;
  bic: string;
}) {
  try {
    const account = await prisma.organization_bank_account.create({
      data: {
        org_id: data.orgId,
        bank_name: data.bank_name,
        iban: data.iban,
        bic: data.bic,
      },
    });

    revalidatePath(`/organization/${data.orgId}/manage`);
    return { success: true, account };
  } catch (error) {
    console.error('Error creating bank account:', error);
    throw new Error('Fehler beim Erstellen des Bankkontos');
  }
}

export async function updateOrganizationBankAccountAction(data: {
  id: string;
  orgId: string;
  bank_name: string;
  iban: string;
  bic: string;
}) {
  try {
    const account = await prisma.organization_bank_account.update({
      where: { id: data.id },
      data: {
        bank_name: data.bank_name,
        iban: data.iban,
        bic: data.bic,
      },
    });

    revalidatePath(`/organization/${data.orgId}/manage`);
    return { success: true, account };
  } catch (error) {
    console.error('Error updating bank account:', error);
    throw new Error('Fehler beim Aktualisieren des Bankkontos');
  }
}

export async function deleteOrganizationBankAccountAction(
  id: string,
  orgId: string
) {
  try {
    await prisma.organization_bank_account.delete({
      where: { id },
    });

    revalidatePath(`/organization/${orgId}/manage`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting bank account:', error);
    throw new Error('Fehler beim Löschen des Bankkontos');
  }
}
//#endregion
//#region ORGANIZATION DETAILS

export async function getOrganizationDetailsAction(orgId: string) {
  try {
    // Hole den ersten (und einzigen) Eintrag für diese Organisation
    const details = await prisma.organization_details.findFirst({
      where: { org_id: orgId },
    });
    return details;
  } catch (error) {
    console.error('Error fetching organization details:', error);
    throw new Error('Fehler beim Laden der Organisationsdetails');
  }
}

export async function saveOrganizationDetailsAction(data: {
  orgId: string;
  website?: string;
  vat?: string;
  zvr?: string;
  authority?: string;
}) {
  try {
    const existing = await prisma.organization_details.findFirst({
      where: { org_id: data.orgId },
    });

    let details;
    if (existing) {
      details = await prisma.organization_details.update({
        where: { id: existing.id },
        data: {
          website: data.website || null,
          vat: data.vat || null,
          zvr: data.zvr || null,
          authority: data.authority || null,
        },
      });
    } else {
      details = await prisma.organization_details.create({
        data: {
          org_id: data.orgId,
          website: data.website || null,
          vat: data.vat || null,
          zvr: data.zvr || null,
          authority: data.authority || null,
        },
      });
    }

    revalidatePath(`/organization/${data.orgId}/manage`);
    return { success: true, details };
  } catch (error) {
    console.error('Error saving organization details:', error);
    throw new Error('Fehler beim Speichern der Organisationsdetails');
  }
}
//#endregion
