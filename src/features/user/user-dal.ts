'use server';

import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export async function getAllUsersWithRolesByOrgIds(
  org_ids: string[],
  role: string | null = null
) {
  const roleFilter = role ? { role: { name: role } } : {};

  const users = await prisma.user.findMany({
    where: {
      user_organization_role: {
        some: {
          org_id: { in: org_ids },
          ...roleFilter,
        },
      },
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      user_organization_role: {
        where: {
          org_id: { in: org_ids },
          ...roleFilter,
        },
        select: {
          id: true,
          role: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
      },
      user_property_value: {
        where: {
          user_property: {
            org_id: { in: org_ids },
          },
        },
        select: {
          id: true,
          user_property_id: true,
          value: true,
        },
      },
    },
  });
  return users;
}

export async function getAllUsersWithRolesByOrgId(
  org_id: string,
  role: string | null = null
) {
  const roleFilter = role ? { role: { name: role } } : {};

  const users = await prisma.user.findMany({
    where: {
      user_organization_role: {
        some: {
          org_id: org_id,
          ...roleFilter,
        },
      },
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      user_organization_role: {
        where: {
          org_id: org_id,
          ...roleFilter,
        },
        select: {
          id: true,
          role: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
        },
      },
      user_property_value: {
        where: {
          user_property: {
            org_id: org_id,
          },
        },
        select: {
          id: true,
          user_property_id: true,
          value: true,
        },
      },
    },
  });
  return users;
}

export async function setUserActiveOrganization(userId: string, orgId: string) {
  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        active_org: orgId,
      },
    });
    return user;
  } catch (error: Error | unknown) {
    console.error("Error updating user's active organization:", error);
  }
}

export async function createAvatarUploadUrl(
  userId: string,
  invitationId: string
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ SERVER ONLY
  );

  const invitationUser = await prisma.invitation.findFirstOrThrow({
    where: {
      id: invitationId,
      expires_at: {
        gt: new Date(),
      },
      new_user_id: userId,
    },
    select: {
      new_user_id: true,
    },
  });

  if (!invitationUser) {
    throw new Error('either UserID or Invitation is invalid');
  }

  const filePath = `${invitationUser.new_user_id}/avatar.webp`;

  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUploadUrl(filePath, { upsert: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    uploadUrl: data.signedUrl,
    path: filePath,
  };
}

export async function deleteAvatarFromStorage(userId: string) {
  // TODO: fix delete function, doesnt delete anything right now
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabaseAdmin.storage.from('avatars').remove([`${userId}/avatar.webp`]);
}
