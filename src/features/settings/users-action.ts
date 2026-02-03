'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { hasPermission } from '@/lib/auth/authGuard';

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
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
      abbreviation: ur.role.abbreviation ?? '',
    },
  }));
}

export async function getAllUserOrgRolesAction(orgId: string | undefined) {
  if (!orgId) throw new Error('Organization ID is required');

  const session = await checkUserSession();

  if (
    !session.user.orgIds.includes(orgId) ||
    !(await hasPermission(session, 'users:manage', orgId))
  ) {
    throw new Error('Insufficient permissions');
  }
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
      firstname: ur.user.firstname ?? '',
      lastname: ur.user.lastname ?? '',
      phone: ur.user.phone,
      picture_url: ur.user.picture_url,
    },
    role: {
      id: ur.role.id,
      name: ur.role.name,
      abbreviation: ur.role.abbreviation ?? '',
    },
  }));
}

export async function updateUserRoleAction(
  userId: string,
  organizationId: string,
  roleAbbreviation: string,
  action: 'add' | 'remove'
) {
  const session = await checkUserSession();

  const hasManagePermission = await hasPermission(
    session,
    'users:manage',
    organizationId
  );
  if (!hasManagePermission) {
    throw new Error('Insufficient permissions');
  }

  const requestingUserRole = await prisma.user_organization_role.findMany({
    where: {
      org_id: organizationId,
      user_id: session.user.id,
    },
    include: { role: true },
  });

  if (!requestingUserRole) throw new Error('Forbidden');
  const isPermitted =
    requestingUserRole.some(
      (role) => role.role?.name === 'Organisationsverwaltung'
    ) ||
    requestingUserRole.some((role) => role.role?.abbreviation === 'OV') ||
    requestingUserRole.some((role) => role.role?.name === 'Superadmin');

  if (!isPermitted) throw new Error('Insufficient permissions');

  const role = await prisma.role.findFirst({
    where: {
      OR: [{ abbreviation: roleAbbreviation }, { name: roleAbbreviation }],
    },
  });

  if (!role) throw new Error(`Role ${roleAbbreviation} not found`);

  if (action === 'add') {
    const existing = await prisma.user_organization_role.findFirst({
      where: {
        user_id: userId,
        org_id: organizationId,
        role_id: role.id,
      },
    });

    if (existing) {
      return { message: 'Role already assigned' };
    }

    await prisma.user_organization_role.create({
      data: {
        user_id: userId,
        org_id: organizationId,
        role_id: role.id,
      },
    });
  } else if (action === 'remove') {
    await prisma.user_organization_role.deleteMany({
      where: {
        user_id: userId,
        org_id: organizationId,
        role_id: role.id,
      },
    });
  }

  revalidatePath(`/organization/${organizationId}`);

  return { message: 'Role updated successfully' };
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
    throw new Error('Forbidden');
  }

  const isSuperadmin = requestingUserRoles.some(
    (role) => role.role?.name === 'Superadmin'
  );
  const isOV = requestingUserRoles.some(
    (role) =>
      role.role?.name === 'Organisationsverwaltung' ||
      role.role?.abbreviation === 'OV'
  );

  const targetUserRoles = await prisma.user_organization_role.findMany({
    where: {
      user_id: userId,
      org_id: organizationId,
    },
    include: { role: true },
  });

  const targetIsSuperadmin = targetUserRoles.some(
    (role) => role.role?.name === 'Superadmin'
  );

  if (targetIsSuperadmin && !isSuperadmin) {
    throw new Error(
      'Only Superadmins can remove other Superadmins from the organization'
    );
  }

  if (!isOV && !isSuperadmin) {
    throw new Error('Insufficient permissions to remove users');
  }

  await prisma.user_organization_role.deleteMany({
    where: {
      user_id: userId,
      org_id: organizationId,
    },
  });

  revalidatePath(`/organization/${organizationId}`);

  return { message: 'User removed from organization' };
}

export async function promoteToSuperadminAction(
  userId: string,
  organizationId: string
) {
  const session = await checkUserSession();

  return await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organisation nicht gefunden');
    }

    const requestingUserRoles = await tx.user_organization_role.findMany({
      where: {
        org_id: organizationId,
        user_id: session.user.id,
      },
      include: { role: true },
    });

    const isSuperadmin = requestingUserRoles.some(
      (role) => role.role?.name === 'Superadmin'
    );

    if (!isSuperadmin) {
      throw new Error(
        'Nur Superadmins können andere Benutzer zu Superadmins ernennen'
      );
    }

    const targetUserInOrg = await tx.user_organization_role.findFirst({
      where: {
        user_id: userId,
        org_id: organizationId,
      },
    });

    if (!targetUserInOrg) {
      throw new Error('Benutzer gehört nicht zu dieser Organisation');
    }

    const superadminRole = await tx.role.findFirst({
      where: { name: 'Superadmin' },
    });

    if (!superadminRole) {
      throw new Error('Superadmin-Rolle nicht gefunden');
    }

    const existingSuperadmin = await tx.user_organization_role.findFirst({
      where: {
        user_id: userId,
        org_id: organizationId,
        role_id: superadminRole.id,
      },
    });

    if (existingSuperadmin) {
      throw new Error('Benutzer ist bereits Superadmin');
    }

    await tx.user_organization_role.create({
      data: {
        user_id: userId,
        org_id: organizationId,
        role_id: superadminRole.id,
      },
    });

    revalidatePath(`/organization/${organizationId}`);

    return { message: 'Benutzer erfolgreich zum Superadmin ernannt' };
  });
}

export async function demoteFromSuperadminAction(
  userId: string,
  organizationId: string
) {
  const session = await checkUserSession();

  return await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organisation nicht gefunden');
    }

    const requestingUserRoles = await tx.user_organization_role.findMany({
      where: {
        org_id: organizationId,
        user_id: session.user.id,
      },
      include: { role: true },
    });

    const isSuperadmin = requestingUserRoles.some(
      (role) => role.role?.name === 'Superadmin'
    );

    if (!isSuperadmin) {
      throw new Error('Nur Superadmins können andere Superadmins degradieren');
    }

    if (userId === session.user.id) {
      throw new Error('Sie können sich nicht selbst degradieren');
    }

    const superadminRole = await tx.role.findFirst({
      where: { name: 'Superadmin' },
    });

    if (!superadminRole) {
      throw new Error('Superadmin-Rolle nicht gefunden');
    }

    const superadminCount = await tx.user_organization_role.count({
      where: {
        org_id: organizationId,
        role_id: superadminRole.id,
      },
    });

    if (superadminCount <= 1) {
      throw new Error(
        'Mindestens ein Superadmin muss in der Organisation verbleiben'
      );
    }

    await tx.user_organization_role.deleteMany({
      where: {
        user_id: userId,
        org_id: organizationId,
        role_id: superadminRole.id,
      },
    });

    revalidatePath(`/organization/${organizationId}`);

    return { message: 'Superadmin-Rolle erfolgreich entfernt' };
  });
}
