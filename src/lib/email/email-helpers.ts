'use server';

import prisma from '@/lib/prisma';

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

  // 1. Ersteller hinzufügen (falls vorhanden und hat E-Mail)
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

  // 2. Alle Bearbeiter mit Verwaltungsrolle hinzufügen
  // SEPARATE Query für change_log!
  const changeLogs = await prisma.change_log.findMany({
    where: {
      einsatz_id: einsatzId,
      type_id: '052f7f39-cf1c-439d-864d-24f3caa2cc07', // 'E-Bearbeitet'
    },
    select: {
      user_id: true,
    },
  });

  const editorUserIds = [
    ...new Set(changeLogs.map((log) => log.user_id).filter(Boolean)),
  ] as string[];

  if (editorUserIds.length > 0) {
    // Prüfe welche dieser User Verwaltungsrollen haben
    const editorsWithAdminRole = await prisma.user_organization_role.findMany({
      where: {
        user_id: { in: editorUserIds },
        org_id: einsatz.org_id,
        role: {
          OR: [{ abbreviation: 'OV' }, { name: 'Superadmin' }],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    for (const editor of editorsWithAdminRole) {
      if (editor.user.email && !recipientMap.has(editor.user.id)) {
        recipientMap.set(editor.user.id, {
          email: editor.user.email,
          name: `${editor.user.firstname} ${editor.user.lastname}`,
        });
      }
    }
  }

  const recipients = Array.from(recipientMap.values());

  return recipients;
}

/**
 * Prüft NACH dem Eintragen ob Anforderungen erfüllt sind und sendet ggf. Warnung
 * Wird aufgerufen nachdem sich jemand eingetragen hat
 */
export async function checkEinsatzRequirementsAfterAssignment(
  einsatzId: string,
  assignedUserId: string
) {
  const { emailService } = await import('@/lib/email/EmailService');

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

  // 1. Prüfe Mindestanzahl Helfer
  if (assignedUsers.length < einsatz.helpers_needed) {
    warnings.push(
      `Mindestanzahl Teilnehmer: ${einsatz.helpers_needed} benötigt (aktuell: ${assignedUsers.length})`
    );
  }

  // 2. Prüfe erforderliche Personeneigenschaften
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

  // 3. Wenn Warnungen vorhanden, sende E-Mail
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
        console.log('Warn-E-Mail erfolgreich versendet');
      } catch (error) {
        console.error('❌ Fehler beim Senden der Warn-E-Mail:', error);
      }
    } else {
      console.log('Keine Empfänger gefunden - E-Mail nicht versendet');
    }
  } else {
    console.log('Alle Anforderungen erfüllt - keine Warnung nötig');
  }
}
