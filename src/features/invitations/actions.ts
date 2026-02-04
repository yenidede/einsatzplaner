// src/features/invitations/actions.ts

'use server';

import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { DIGBIZ_CONFIG } from '@/features/invitations/constants';

export async function createDigbizInvitationFromLinkAction(input: {
  organizationId: string;
  mode: 'h' | 'j';
}): Promise<{ success: true; token: string }> {
  try {
    // Validate input
    if (!input.organizationId || !input.mode) {
      throw new Error('Ungültige Parameter');
    }

    if (!['h', 'j'].includes(input.mode)) {
      throw new Error('Ungültiger Modus');
    }

    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });

    if (!organization) {
      throw new Error('Organisation nicht gefunden');
    }

    // Determine role IDs based on mode
    const roleIds =
      input.mode === 'j'
        ? DIGBIZ_CONFIG.JURY_ROLE_IDS
        : DIGBIZ_CONFIG.HELPER_ROLE_IDS;

    // Validate role IDs
    if (roleIds.some((id) => id.startsWith('REPLACE_WITH_'))) {
      throw new Error(
        'DigBiz-Konfiguration ist unvollständig. Bitte konfigurieren Sie die Rollen-IDs in constants.ts'
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Compute indexed email
    const existingCount = await prisma.user.count({
      where: {
        email: {
          startsWith: DIGBIZ_CONFIG.EMAIL_PREFIX,
          endsWith: DIGBIZ_CONFIG.EMAIL_DOMAIN,
        },
      },
    });

    const email = `${DIGBIZ_CONFIG.EMAIL_PREFIX}${existingCount + 1}${DIGBIZ_CONFIG.EMAIL_DOMAIN}`;

    // Create invitation records (one per role, same token)
    const expiresAt = new Date(Date.now() + DIGBIZ_CONFIG.TOKEN_EXPIRATION_MS);

    await Promise.all(
      roleIds.map(async (roleId) =>
        prisma.invitation.create({
          data: {
            email,
            org_id: input.organizationId,
            role_id: roleId,
            token,
            expires_at: expiresAt,
            accepted: false,
            invited_by: await getSystemUserId(input.organizationId),
          },
        })
      )
    );

    return { success: true, token };
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error('Fehler beim Erstellen der DigBiz-Einladung');
  }
}

async function getSystemUserId(organizationId: string): Promise<string> {
  const adminUser = await prisma.user_organization_role.findFirst({
    where: {
      org_id: organizationId,
    },
    select: {
      user_id: true,
    },
    orderBy: {
      user_id: 'asc',
    },
  });

  if (!adminUser) {
    throw new Error(
      'Keine Benutzer in dieser Organisation gefunden. Bitte erstellen Sie zuerst einen Admin-Benutzer.'
    );
  }

  return adminUser.user_id;
}
