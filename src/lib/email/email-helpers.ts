'use server';

import prisma from '@/lib/prisma';
import { emailService } from '@/lib/email/EmailService';
import { ChangeTypeIds } from '@/features/activity_log/changeTypeIds';

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
    return [];
  }

  const recipientMap = new Map<string, { email: string; name: string }>();

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

  const editorUserIds = [
    ...new Set(changeLogs.map((log) => log.user_id).filter(Boolean)),
  ] as string[];

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
            email: user.email,
            name: `${user.firstname} ${user.lastname}`,
          });
        }
      }
    }
  }

  return Array.from(recipientMap.values());
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
    const recipients = await getEinsatzWarningRecipients(einsatzId);

    if (recipients.length > 0) {
      try {
        await emailService.sendEinsatzWarningEmail(
          recipients,
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
