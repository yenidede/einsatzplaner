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
  deriveRulesFromLegacy,
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
    (error.message.includes('relation') || error.message.includes('column')) &&
    error.message.includes('does not exist')
  ) {
    throw new Error(
      'Das Benachrichtigungsdatenmodell ist noch nicht vollständig in der Datenbank vorhanden. Bitte führen Sie docs/sql/notification-priority-rules.sql und docs/sql/notification-digest-queue.sql in Ihrer Datenbank aus.'
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
        tx,
        defaults
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
        urgentDelivery:
          nextUseOrganizationDefaults
            ? currentPreference?.urgentDelivery ?? null
            : currentPreference?.urgentDelivery ??
              previousEffective.urgentDelivery,
        importantDelivery:
          nextUseOrganizationDefaults
            ? currentPreference?.importantDelivery ?? null
            : currentPreference?.importantDelivery ??
              previousEffective.importantDelivery,
        generalDelivery:
          nextUseOrganizationDefaults
            ? currentPreference?.generalDelivery ?? null
            : currentPreference?.generalDelivery ??
              previousEffective.generalDelivery,
        digestInterval:
          nextUseOrganizationDefaults
            ? currentPreference?.digestInterval ?? null
            : currentPreference?.digestInterval ?? previousEffective.digestInterval,
        digestTime:
          nextUseOrganizationDefaults
            ? currentPreference?.digestTime ?? null
            : currentPreference?.digestTime ?? previousEffective.digestTime,
        digestSecondTime:
          nextUseOrganizationDefaults
            ? currentPreference?.digestSecondTime ?? null
            : currentPreference?.digestSecondTime ??
              previousEffective.digestSecondTime,
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
  urgentDelivery: 'immediate' | 'digest';
  importantDelivery: 'immediate' | 'digest';
  generalDelivery: 'digest' | 'off';
  digestInterval:
    | 'daily'
    | 'every_2_days'
    | 'every_3_days'
    | 'every_5_days'
    | 'every_7_days';
  digestTime: string;
  digestSecondTime?: string;
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
        tx,
        defaults
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
        urgentDelivery: parsed.urgentDelivery,
        importantDelivery: parsed.importantDelivery,
        generalDelivery: parsed.generalDelivery,
        digestInterval: parsed.digestInterval,
        digestTime: parsed.digestTime,
        digestSecondTime:
          parsed.digestSecondTime ?? previousEffective.digestSecondTime,
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
  urgentDeliveryDefault?: 'immediate' | 'digest';
  importantDeliveryDefault?: 'immediate' | 'digest';
  generalDeliveryDefault?: 'digest' | 'off';
  digestIntervalDefault:
    | 'daily'
    | 'every_2_days'
    | 'every_3_days'
    | 'every_5_days'
    | 'every_7_days';
  digestTimeDefault: string;
  digestSecondTimeDefault: string;
}) {
  const parsed = updateOrganizationNotificationDefaultsInputSchema.parse(input);
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

      const canUpdate = await hasPermission(
        session,
        'organization:update',
        parsed.organizationId,
        tx
      );

      if (!canUpdate) {
        throw new Error('Sie haben keine Berechtigung für diese Einstellung.');
      }

      const previousDefaults = await getOrganizationNotificationDefaults(
        parsed.organizationId,
        tx
      );
      const fallbackRules = deriveRulesFromLegacy({
        deliveryMode: parsed.deliveryModeDefault,
        minimumPriority: parsed.minimumPriorityDefault,
      });

      // Backward compatibility: legacy callers may omit the explicit
      // urgent/important/general defaults. In that case, we derive them from the
      // legacy fields (deliveryModeDefault + minimumPriorityDefault) before upsert.
      // The current UI sends all three fields explicitly.
      await upsertOrganizationNotificationDefaults(
        {
          organizationId: parsed.organizationId,
          emailEnabledDefault: parsed.emailEnabledDefault,
          deliveryModeDefault: parsed.deliveryModeDefault,
          minimumPriorityDefault: parsed.minimumPriorityDefault,
          urgentDeliveryDefault:
            parsed.urgentDeliveryDefault ?? fallbackRules.urgentDelivery,
          importantDeliveryDefault:
            parsed.importantDeliveryDefault ?? fallbackRules.importantDelivery,
          generalDeliveryDefault:
            parsed.generalDeliveryDefault ?? fallbackRules.generalDelivery,
          digestIntervalDefault: parsed.digestIntervalDefault,
          digestTimeDefault: parsed.digestTimeDefault,
          digestSecondTimeDefault: parsed.digestSecondTimeDefault,
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
