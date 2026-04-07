'use server';

import prisma from '@/lib/prisma';
import { emailService } from '@/lib/email/EmailService';
import { ChangeTypeIds } from '@/features/activity_log/changeTypeIds';
import { getEffectiveNotificationSettingsForUsers } from '@/features/notification-preferences/notification-preferences-dal';
import {
  enqueueNotificationDigestItem,
  isDigestQueueSchemaMissingError,
} from '@/features/notification-preferences/notification-email-digest-dal';
import type {
  DigestInterval,
  DigestTime,
} from '@/features/notification-preferences/types';
import {
  splitWarningRecipientsByDelivery,
  type RoutedWarningRecipients,
  type WarningRecipient,
} from '@/lib/email/email-warning-routing';

const einsatzCheckLocks = new Map<string, Promise<void>>();

export async function getAdminRecipientsForInvitation(orgId: string) {
  const admins = await prisma.user_organization_role.findMany({
    where: {
      org_id: orgId,
      role: {
        OR: [{ abbreviation: 'OV' }, { name: 'Superadmin' }],
      },
    },
    include: {
      user: {
        select: {
          email: true,
          firstname: true,
          lastname: true,
        },
      },
      role: {
        select: {
          name: true,
          abbreviation: true,
        },
      },
    },
  });

  const recipients = admins
    .filter((admin) => admin.user.email)
    .map((admin) => ({
      email: admin.user.email,
      name: `${admin.user.firstname} ${admin.user.lastname}`,
    }));

  return recipients;
}

export async function getEinsatzWarningRecipients(einsatzId: string) {
  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          einsatz_name_singular: true,
          einsatz_name_plural: true,
          helper_name_singular: true,
          helper_name_plural: true,
        },
      },
      einsatz_helper: {
        include: {
          user: {
            include: {
              user_property_value: {
                include: {
                  user_property: {
                    include: {
                      field: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      einsatz_user_property: {
        include: {
          user_property: {
            include: {
              field: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!einsatz) {
    return {
      organizationId: null,
      recipients: [],
    };
  }

  const recipientMap = new Map<string, WarningRecipient>();

  if (einsatz.created_by) {
    const creator = await prisma.user.findUnique({
      where: { id: einsatz.created_by },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
      },
    });

    if (creator?.email) {
      recipientMap.set(creator.id, {
        userId: creator.id,
        email: creator.email,
        name: `${creator.firstname} ${creator.lastname}`,
      });
    }
  }

  const changeLogs = await prisma.change_log.findMany({
    where: {
      einsatz_id: einsatzId,
      type_id: ChangeTypeIds['E-Bearbeitet'],
    },
    select: {
      user_id: true,
    },
  });

  const editorUserIds = Array.from(
    new Set(
      changeLogs
        .map((log) => log.user_id)
        .filter((userId): userId is string => typeof userId === 'string')
    )
  );

  if (editorUserIds.length > 0) {
    const adminUserIds = await prisma.user_organization_role.findMany({
      where: {
        user_id: { in: editorUserIds },
        org_id: einsatz.org_id,
        role: {
          OR: [{ abbreviation: 'OV' }, { name: 'Superadmin' }],
        },
      },
      select: {
        user_id: true,
      },
      distinct: ['user_id'],
    });

    const uniqueAdminUserIds = adminUserIds.map((r) => r.user_id);

    if (uniqueAdminUserIds.length > 0) {
      const adminUsers = await prisma.user.findMany({
        where: {
          id: { in: uniqueAdminUserIds },
        },
        select: {
          id: true,
          email: true,
          firstname: true,
          lastname: true,
        },
      });

      for (const user of adminUsers) {
        if (user.email && !recipientMap.has(user.id)) {
          recipientMap.set(user.id, {
            userId: user.id,
            email: user.email,
            name: `${user.firstname} ${user.lastname}`,
          });
        }
      }
    }
  }

  return {
    organizationId: einsatz.org_id,
    recipients: Array.from(recipientMap.values()),
  };
}

export async function routeEinsatzWarningRecipientsByPreference(input: {
  organizationId: string;
  recipients: WarningRecipient[];
}): Promise<RoutedWarningRecipients> {
  const recipientUserIds = input.recipients.map((recipient) => recipient.userId);
  const effectiveSettingsByUser = await getEffectiveNotificationSettingsForUsers({
    organizationId: input.organizationId,
    userIds: recipientUserIds,
  });

  return splitWarningRecipientsByDelivery({
    recipients: input.recipients,
    settingsByUserId: effectiveSettingsByUser,
  });
}

async function enqueueEinsatzWarningDigestNotifications(input: {
  organizationId: string;
  digestRecipients: Array<{
    userId: string;
    email: string;
    name: string;
    digestInterval: DigestInterval;
    digestTime: DigestTime;
    digestSecondTime: DigestTime;
  }>;
  einsatz: {
    id: string;
    title: string;
    start: Date;
  };
  warnings: string[];
}) {
  const appUrl = process.env.NEXTAUTH_URL;
  const einsatzUrl = appUrl
    ? `${appUrl}/einsatzverwaltung?einsatz=${input.einsatz.id}`
    : `/einsatzverwaltung?einsatz=${input.einsatz.id}`;

  for (const recipient of input.digestRecipients) {
    const dedupeKey = [
      recipient.userId,
      input.organizationId,
      input.einsatz.id,
      input.einsatz.start.toISOString(),
      input.warnings.join('|'),
    ].join(':');

    await enqueueNotificationDigestItem({
      userId: recipient.userId,
      organizationId: input.organizationId,
      priority: 'critical',
      digestInterval: recipient.digestInterval,
      digestTime: recipient.digestTime,
      digestSecondTime: recipient.digestSecondTime,
      eventType: 'einsatz_requirements_warning',
      dedupeKey,
      payload: {
        einsatzId: input.einsatz.id,
        einsatzTitle: input.einsatz.title,
        einsatzStartIso: input.einsatz.start.toISOString(),
        warningLines: input.warnings,
        einsatzUrl,
      },
    });
  }
}

export async function checkEinsatzRequirementsAfterAssignment(
  einsatzId: string
) {
  const existingLock = einsatzCheckLocks.get(einsatzId);
  if (existingLock) {
    await existingLock;
    return;
  }

  const checkPromise = performEinsatzCheck(einsatzId);
  einsatzCheckLocks.set(einsatzId, checkPromise);

  try {
    await checkPromise;
  } finally {
    setTimeout(() => {
      einsatzCheckLocks.delete(einsatzId);
    }, 1000);
  }
}

async function performEinsatzCheck(einsatzId: string) {
  const einsatz = await prisma.einsatz.findUnique({
    where: { id: einsatzId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          einsatz_name_singular: true,
          einsatz_name_plural: true,
          helper_name_singular: true,
          helper_name_plural: true,
        },
      },
      einsatz_helper: {
        include: {
          user: {
            include: {
              user_property_value: {
                include: {
                  user_property: {
                    include: {
                      field: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      einsatz_user_property: {
        include: {
          user_property: {
            include: {
              field: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!einsatz) {
    console.error(`Einsatz ${einsatzId} nicht gefunden`);
    return;
  }

  const warnings: string[] = [];
  const assignedUsers = einsatz.einsatz_helper.map((h) => h.user);

  if (assignedUsers.length < einsatz.helpers_needed) {
    warnings.push(
      `Mindestanzahl Teilnehmer: ${einsatz.helpers_needed} benötigt (aktuell: ${assignedUsers.length})`
    );
  }

  for (const requirement of einsatz.einsatz_user_property) {
    if (requirement.is_required) {
      const minRequired = requirement.min_matching_users || 1;

      const matchingUsers = assignedUsers.filter((user) =>
        user.user_property_value.some(
          (propValue) =>
            propValue.user_property_id === requirement.user_property_id
        )
      );

      if (matchingUsers.length < minRequired) {
        warnings.push(
          `Personeneigenschaft '${requirement.user_property.field.name}': mind. ${minRequired} benötigt (aktuell: ${matchingUsers.length})`
        );
      }
    }
  }

  if (warnings.length > 0) {
    const recipientData = await getEinsatzWarningRecipients(einsatzId);

    if (
      recipientData.organizationId &&
      recipientData.recipients.length > 0
    ) {
      try {
        const routedRecipients = await routeEinsatzWarningRecipientsByPreference({
          organizationId: recipientData.organizationId,
          recipients: recipientData.recipients,
        });

        if (routedRecipients.immediateRecipients.length > 0) {
          await emailService.sendEinsatzWarningEmail(
            routedRecipients.immediateRecipients,
            {
              id: einsatz.id,
              title: einsatz.title,
              start: einsatz.start,
            },
            warnings,
            {
              name: einsatz.organization.name,
              einsatz_name_singular: einsatz.organization.einsatz_name_singular,
              einsatz_name_plural: einsatz.organization.einsatz_name_plural,
              helper_name_singular:
                einsatz.organization.helper_name_singular || 'Helfer:in',
              helper_name_plural:
                einsatz.organization.helper_name_plural || 'Helfer:innen',
            }
          );
        }

        if (routedRecipients.digestRecipients.length > 0) {
          try {
            await enqueueEinsatzWarningDigestNotifications({
              organizationId: recipientData.organizationId,
              digestRecipients: routedRecipients.digestRecipients,
              einsatz: {
                id: einsatz.id,
                title: einsatz.title,
                start: einsatz.start,
              },
              warnings,
            });
          } catch (error) {
            if (isDigestQueueSchemaMissingError(error)) {
              await emailService.sendEinsatzWarningEmail(
                routedRecipients.digestRecipients.map((recipient) => ({
                  email: recipient.email,
                  name: recipient.name,
                })),
                {
                  id: einsatz.id,
                  title: einsatz.title,
                  start: einsatz.start,
                },
                warnings,
                {
                  name: einsatz.organization.name,
                  einsatz_name_singular: einsatz.organization.einsatz_name_singular,
                  einsatz_name_plural: einsatz.organization.einsatz_name_plural,
                  helper_name_singular:
                    einsatz.organization.helper_name_singular || 'Helfer:in',
                  helper_name_plural:
                    einsatz.organization.helper_name_plural || 'Helfer:innen',
                }
              );
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error('Fehler beim Senden der Warn-E-Mail:', error);
      }
    } else {
      console.log('ℹKeine Empfänger gefunden - E-Mail nicht versendet');
    }
  } else {
    console.log('Alle Anforderungen erfüllt - keine Warnung nötig');
  }
}
