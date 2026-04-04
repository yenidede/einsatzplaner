'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/auth/authGuard';
import {
  getMyOrganizationNotificationCards,
  getOrganizationNotificationDefaults,
  getUserOrganizationNotificationPreference,
  isUserInOrganization,
  syncLegacyMailNotificationForOrgDefaultsUsers,
  syncLegacyMailNotificationForUser,
  upsertOrganizationNotificationDefaults,
  upsertUserOrganizationNotificationPreference,
} from './notification-preferences-dal';
import {
  resolveEffectiveNotificationSettings,
} from './notification-preferences-utils';
import {
  updateMyNotificationDetailsInputSchema,
  updateMyNotificationPrimaryInputSchema,
  updateOrganizationNotificationDefaultsInputSchema,
} from './types';

async function checkUserSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Nicht autorisiert.');
  }

  return session;
}

function normalizeSchemaError(error: unknown): never {
  if (
    error instanceof Error &&
    error.message.includes('relation') &&
    error.message.includes('does not exist')
  ) {
    throw new Error(
      'Das Benachrichtigungsdatenmodell ist noch nicht in der Datenbank vorhanden. Bitte führen Sie zuerst das SQL-Migrationsskript aus.'
    );
  }

  throw error;
}

export async function getMyOrganizationNotificationPreferencesAction() {
  const session = await checkUserSession();

  try {
    return await getMyOrganizationNotificationCards(session.user.id);
  } catch (error) {
    normalizeSchemaError(error);
  }
}

export async function getOrganizationNotificationDefaultsAction(
  organizationId: string
) {
  const session = await checkUserSession();

  const isMember = await isUserInOrganization(session.user.id, organizationId);
  if (!isMember) {
    throw new Error('Sie sind kein Mitglied dieser Organisation.');
  }

  try {
    return await getOrganizationNotificationDefaults(organizationId);
  } catch (error) {
    normalizeSchemaError(error);
  }
}

export async function updateMyNotificationPrimaryAction(input: {
  organizationId: string;
  useOrganizationDefaults?: boolean;
  emailEnabled?: boolean;
}) {
  const parsed = updateMyNotificationPrimaryInputSchema.parse(input);
  const session = await checkUserSession();

  try {
    return await prisma.$transaction(async (tx) => {
      const isMember = await isUserInOrganization(
        session.user.id,
        parsed.organizationId,
        tx
      );

      if (!isMember) {
        throw new Error('Sie sind kein Mitglied dieser Organisation.');
      }

      const defaults = await getOrganizationNotificationDefaults(
        parsed.organizationId,
        tx
      );
      const currentPreference = await getUserOrganizationNotificationPreference(
        session.user.id,
        parsed.organizationId,
        tx
      );

      const previousEffective = resolveEffectiveNotificationSettings({
        defaults,
        preference: currentPreference,
      });

      const currentUsesDefaults =
        !currentPreference || currentPreference.useOrganizationDefaults;

      let nextUseOrganizationDefaults =
        parsed.useOrganizationDefaults ?? currentUsesDefaults;

      if (
        parsed.useOrganizationDefaults === undefined &&
        parsed.emailEnabled !== undefined &&
        currentUsesDefaults
      ) {
        nextUseOrganizationDefaults = false;
      }

      const nextPreference = {
        userId: session.user.id,
        organizationId: parsed.organizationId,
        useOrganizationDefaults: nextUseOrganizationDefaults,
        emailEnabled:
          nextUseOrganizationDefaults
            ? currentPreference?.emailEnabled ?? null
            : parsed.emailEnabled ??
              currentPreference?.emailEnabled ??
              previousEffective.emailEnabled,
        deliveryMode:
          nextUseOrganizationDefaults
            ? currentPreference?.deliveryMode ?? null
            : currentPreference?.deliveryMode ?? previousEffective.deliveryMode,
        minimumPriority:
          nextUseOrganizationDefaults
            ? currentPreference?.minimumPriority ?? null
            : currentPreference?.minimumPriority ??
              previousEffective.minimumPriority,
        digestInterval:
          nextUseOrganizationDefaults
            ? currentPreference?.digestInterval ?? null
            : currentPreference?.digestInterval ?? previousEffective.digestInterval,
      };

      await upsertUserOrganizationNotificationPreference(nextPreference, tx);

      const nextEffective = resolveEffectiveNotificationSettings({
        defaults,
        preference: nextPreference,
      });

      if (previousEffective.emailEnabled !== nextEffective.emailEnabled) {
        await syncLegacyMailNotificationForUser(
          {
            userId: session.user.id,
            organizationId: parsed.organizationId,
            emailEnabled: nextEffective.emailEnabled,
          },
          tx
        );
      }

      return {
        success: true,
        skipped: false,
      };
    });
  } catch (error) {
    normalizeSchemaError(error);
  }
}

export async function updateMyNotificationDetailsAction(input: {
  organizationId: string;
  deliveryMode: 'critical_only' | 'digest_only' | 'critical_and_digest';
  minimumPriority: 'info' | 'review' | 'critical';
  digestInterval: 'daily' | 'twice_daily';
}) {
  const parsed = updateMyNotificationDetailsInputSchema.parse(input);
  const session = await checkUserSession();

  try {
    return await prisma.$transaction(async (tx) => {
      const isMember = await isUserInOrganization(
        session.user.id,
        parsed.organizationId,
        tx
      );

      if (!isMember) {
        throw new Error('Sie sind kein Mitglied dieser Organisation.');
      }

      const defaults = await getOrganizationNotificationDefaults(
        parsed.organizationId,
        tx
      );
      const currentPreference = await getUserOrganizationNotificationPreference(
        session.user.id,
        parsed.organizationId,
        tx
      );

      const previousEffective = resolveEffectiveNotificationSettings({
        defaults,
        preference: currentPreference,
      });

      const usesOrganizationDefaults =
        !currentPreference || currentPreference.useOrganizationDefaults;

      if (usesOrganizationDefaults || previousEffective.emailEnabled === false) {
        return {
          success: true,
          skipped: true,
        };
      }

      const nextPreference = {
        userId: session.user.id,
        organizationId: parsed.organizationId,
        useOrganizationDefaults: false,
        emailEnabled:
          currentPreference.emailEnabled ?? previousEffective.emailEnabled,
        deliveryMode: parsed.deliveryMode,
        minimumPriority: parsed.minimumPriority,
        digestInterval: parsed.digestInterval,
      };

      await upsertUserOrganizationNotificationPreference(nextPreference, tx);

      const nextEffective = resolveEffectiveNotificationSettings({
        defaults,
        preference: nextPreference,
      });

      if (previousEffective.emailEnabled !== nextEffective.emailEnabled) {
        await syncLegacyMailNotificationForUser(
          {
            userId: session.user.id,
            organizationId: parsed.organizationId,
            emailEnabled: nextEffective.emailEnabled,
          },
          tx
        );
      }

      return {
        success: true,
        skipped: false,
      };
    });
  } catch (error) {
    normalizeSchemaError(error);
  }
}

export async function updateOrganizationNotificationDefaultsAction(input: {
  organizationId: string;
  emailEnabledDefault: boolean;
  deliveryModeDefault: 'critical_only' | 'digest_only' | 'critical_and_digest';
  minimumPriorityDefault: 'info' | 'review' | 'critical';
  digestIntervalDefault: 'daily' | 'twice_daily';
}) {
  const parsed = updateOrganizationNotificationDefaultsInputSchema.parse(input);
  const session = await checkUserSession();

  const isMember = await isUserInOrganization(session.user.id, parsed.organizationId);
  if (!isMember) {
    throw new Error('Sie sind kein Mitglied dieser Organisation.');
  }

  const canUpdate = await hasPermission(
    session,
    'organization:update',
    parsed.organizationId
  );

  if (!canUpdate) {
    throw new Error('Sie haben keine Berechtigung für diese Einstellung.');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const previousDefaults = await getOrganizationNotificationDefaults(
        parsed.organizationId,
        tx
      );

      await upsertOrganizationNotificationDefaults(
        {
          organizationId: parsed.organizationId,
          emailEnabledDefault: parsed.emailEnabledDefault,
          deliveryModeDefault: parsed.deliveryModeDefault,
          minimumPriorityDefault: parsed.minimumPriorityDefault,
          digestIntervalDefault: parsed.digestIntervalDefault,
        },
        tx
      );

      if (previousDefaults.emailEnabledDefault !== parsed.emailEnabledDefault) {
        await syncLegacyMailNotificationForOrgDefaultsUsers(
          {
            organizationId: parsed.organizationId,
            emailEnabledDefault: parsed.emailEnabledDefault,
          },
          tx
        );
      }

      return {
        success: true,
      };
    });
  } catch (error) {
    normalizeSchemaError(error);
  }
}
