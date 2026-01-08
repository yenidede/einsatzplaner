'use server';

import { requireAuth } from '@/lib/auth/authGuard';
import prisma from '@/lib/prisma';

export async function getActiveInvitationsByOrgId(orgId: string) {
  const { session } = await requireAuth();

  if (!session.user.orgIds.includes(orgId)) {
    throw new Error('Unauthorized');
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      org_id: orgId,
      accepted: false,
      expires_at: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: { firstname: true, lastname: true },
      },
      role: {
        select: { name: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return invitations;
}

export async function verifyInvitationToken(token: string) {
  if (!token) {
    throw new Error('Token ist erforderlich');
  }

  const invitations = await prisma.invitation.findMany({
    where: { token },
    include: {
      organization: { select: { name: true } },
      role: { select: { name: true } },
    },
  });

  if (!invitations || invitations.length === 0) {
    throw new Error('Einladung nicht gefunden');
  }

  const firstInvitation = invitations[0];

  if (firstInvitation.expires_at < new Date()) {
    throw new Error('Einladung ist abgelaufen');
  }

  if (firstInvitation.accepted) {
    throw new Error('Einladung wurde bereits angenommen');
  }

  const inviter = await prisma.user.findUnique({
    where: { id: firstInvitation.invited_by },
    select: { firstname: true, lastname: true, email: true },
  });

  const inviterName =
    inviter?.firstname && inviter?.lastname
      ? `${inviter.firstname} ${inviter.lastname}`
      : inviter?.email || 'Unbekannt';

  const roleNames = invitations
    .map((inv) => inv.role?.name)
    .filter(Boolean)
    .join(', ');

  return {
    id: firstInvitation.id,
    email: firstInvitation.email,
    organizationName: firstInvitation.organization?.name || 'Organisation',
    roleName: roleNames || 'Helfer',
    roles: invitations.map((inv) => ({
      id: inv.role_id,
      name: inv.role?.name || 'Unbekannt',
    })),
    inviterName,
    expiresAt: firstInvitation.expires_at.toISOString(),
  };
}

export async function getInvitationByToken(token: string) {
  if (!token) {
    return { valid: false, error: 'Token ist erforderlich' };
  }

  const invitations = await prisma.invitation.findMany({
    where: { token },
    include: {
      organization: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
      user: { select: { id: true, firstname: true, lastname: true } },
    },
  });

  if (!invitations || invitations.length === 0) {
    return { valid: false, error: 'Einladung nicht gefunden' };
  }

  const validInvitations = invitations.filter(
    (inv) => new Date(inv.expires_at) >= new Date() && !inv.accepted
  );

  if (validInvitations.length === 0) {
    return { valid: false, error: 'Keine gültigen Einladungen gefunden' };
  }

  const firstInvitation = validInvitations[0];

  return {
    valid: true,
    invitation: {
      id: firstInvitation.id,
      email: firstInvitation.email,
      organization_id: firstInvitation.org_id,
      organizationName: firstInvitation.organization?.name || 'Organisation',
      roleName: validInvitations
        .map((inv) => inv.role?.name)
        .filter(Boolean)
        .join(', '),
      roles: validInvitations.map((inv) => ({
        id: inv.role_id,
        name: inv.role?.name || 'Unbekannt',
      })),
      token: firstInvitation.token,
      expiresAt: firstInvitation.expires_at.toISOString(),
      createdAt: firstInvitation.created_at.toISOString(),
      inviterName:
        firstInvitation.user?.firstname && firstInvitation.user?.lastname
          ? `${firstInvitation.user.firstname} ${firstInvitation.user.lastname}`
          : 'Unbekannt',
    },
  };
}
