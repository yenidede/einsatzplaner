'use server';

import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import {
  getUserWithValidResetToken,
  resetUserPassword,
  getUserByEmail,
  updateUserResetToken,
  createUserWithOrgAndRoles,
} from '@/DataAccessLayer/user';
import { emailService } from '@/lib/email/EmailService';
import { authOptions } from '@/lib/auth.config';
import { actionClient } from '@/lib/safe-action';
import { formSchema as registerFormSchema } from './register-schema';
import prisma from '@/lib/prisma';
import {
  createAndSendOneTimePasswordChallenge,
  consumeVerifiedOneTimePasswordChallenge,
  verifyOneTimePasswordChallenge,
} from './one-time-password';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  newPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

const sendOneTimePasswordSchema = z.object({
  email: z.string().trim().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
});

const verifyOneTimePasswordSchema = z.object({
  email: z.string().trim().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Bitte geben Sie einen gültigen 6-stelligen Code ein'),
});

const getSelfSignupAccountStatusSchema = z.object({
  email: z.string().trim().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
});

const selfSignupOrganizationSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, 'Der Organisationsname ist erforderlich'),
  organizationAbbreviation: z.string().trim().max(5).optional(),
  organizationPhone: z.string().trim().optional(),
  organizationWebsite: z.string().trim().optional(),
  helperSingular: z.string().trim().optional(),
  helperPlural: z.string().trim().optional(),
  einsatzSingular: z.string().trim().optional(),
  einsatzPlural: z.string().trim().optional(),
});

const createSelfSignupSchema = z.discriminatedUnion('accountMode', [
  selfSignupOrganizationSchema.extend({
    accountMode: z.literal('new'),
    firstName: z.string().trim().min(1, 'Der Vorname ist erforderlich'),
    lastName: z.string().trim().min(1, 'Der Nachname ist erforderlich'),
    email: z.string().trim().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
    password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
    challengeId: z.string().uuid('Die Bestätigung ist ungültig.'),
  }),
  selfSignupOrganizationSchema.extend({
    accountMode: z.literal('existing'),
    email: z.string().trim().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
    password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
  }),
  selfSignupOrganizationSchema.extend({
    accountMode: z.literal('logged_in'),
  }),
]);

async function createSelfSignupOrganization(
  tx: Prisma.TransactionClient,
  parsedInput: z.infer<typeof selfSignupOrganizationSchema>
) {
  const organization = await tx.organization.create({
    data: {
      name: parsedInput.organizationName,
      abbreviation: parsedInput.organizationAbbreviation || null,
      phone: parsedInput.organizationPhone || null,
      helper_name_singular: parsedInput.helperSingular || undefined,
      helper_name_plural: parsedInput.helperPlural || undefined,
      einsatz_name_singular: parsedInput.einsatzSingular || undefined,
      einsatz_name_plural: parsedInput.einsatzPlural || undefined,
    },
    select: {
      id: true,
      name: true,
      logo_url: true,
    },
  });

  if (parsedInput.organizationWebsite) {
    await tx.organization_details.create({
      data: {
        org_id: organization.id,
        website: parsedInput.organizationWebsite,
      },
    });
  }

  return organization;
}

async function getAssignableRoleIds(tx: Prisma.TransactionClient) {
  const assignableRoles = await tx.role.findMany({
    select: { id: true },
  });

  if (assignableRoles.length === 0) {
    throw new Error('Es konnten keine Rollen für die neue Organisation gefunden werden.');
  }

  return assignableRoles.map((role) => role.id);
}

async function addUserToOrganizationWithAllRoles(
  tx: Prisma.TransactionClient,
  userId: string,
  organizationId: string
) {
  const roleIds = await getAssignableRoleIds(tx);

  await tx.user.update({
    where: { id: userId },
    data: {
      active_org: organizationId,
      user_organization_role: {
        create: roleIds.map((roleId) => ({
          org_id: organizationId,
          role_id: roleId,
        })),
      },
    },
  });

  return roleIds;
}

export const acceptInviteAndCreateNewAccount = actionClient
  .inputSchema(registerFormSchema)
  .action(async ({ parsedInput }) => {
    try {
      const firstInvitation = await prisma.invitation.findFirst({
        where: {
          id: parsedInput.invitationId,
          email: parsedInput.email,
          expires_at: {
            gt: new Date(),
          },
        },
        select: {
          token: true,
          new_user_id: true,
          organization: true,
        },
      });

      if (!firstInvitation) {
        return {
          success: false,
          message: 'Keine gültige Einladung gefunden',
        };
      }

      const [hashedPassword, invitations] = await Promise.all([
        hash(parsedInput.passwort, 12),
        prisma.invitation.findMany({
          where: {
            email: parsedInput.email,
            token: firstInvitation.token,
            expires_at: {
              gt: new Date(),
            },
          },
          select: {
            organization: true,
            role_id: true,
          },
        }),
      ]);

      if (invitations.length === 0) {
        return {
          success: false,
          message: 'Keine gültigen Einladungen gefunden',
        };
      }

      await createUserWithOrgAndRoles({
        orgId: firstInvitation.organization.id,
        email: parsedInput.email,
        firstname: parsedInput.vorname,
        lastname: parsedInput.nachname,
        password: hashedPassword,
        phone: parsedInput.telefon,
        roleIds: invitations.map((i) => i.role_id),
        salutationId: parsedInput.anredeId,
        userId: firstInvitation.new_user_id || undefined,
        profilePictureUrl: parsedInput.pictureUrl,
      });

      await prisma.invitation.deleteMany({
        where: {
          email: parsedInput.email,
          token: firstInvitation.token,
        },
      });

      return {
        success: true,
        message: 'Account erfolgreich erstellt',
      };
    } catch (error: unknown) {
      console.error('acceptInviteAndCreateNewAccount error:', error);

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Fehler beim Erstellen des Accounts',
      };
    }
  });

export async function resetPasswordAction(data: {
  token: string;
  newPassword: string;
}) {
  try {
    const validated = resetPasswordSchema.parse(data);

    const user = await getUserWithValidResetToken(validated.token);

    if (!user) {
      return {
        success: false,
        error: 'Ungültiger oder abgelaufener Token',
      };
    }

    const hashedPassword = await hash(validated.newPassword, 12);

    await resetUserPassword(user, hashedPassword);

    return {
      success: true,
      message: 'Passwort erfolgreich zurückgesetzt',
    };
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Fehler beim Zurücksetzen des Passworts',
    };
  }
}

export async function forgotPasswordAction(data: { email: string }) {
  try {
    const validated = forgotPasswordSchema.parse(data);
    const hour = 3600000;

    const user = await getUserByEmail(validated.email);

    if (!user) {
      return {
        success: true,
        message:
          'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + hour); // 1 Stunde

    await updateUserResetToken(validated.email, resetToken, resetTokenExpiry);

    try {
      await emailService.sendPasswordResetEmail(validated.email, resetToken);
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
    }

    return {
      success: true,
      message:
        'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.',
    };
  } catch (error) {
    console.error('Forgot password error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Fehler beim Verarbeiten der Anfrage',
    };
  }
}

export const sendOneTimePasswordAction = actionClient
  .inputSchema(sendOneTimePasswordSchema)
  .action(async ({ parsedInput }) => {
    const challenge = await createAndSendOneTimePasswordChallenge({
      email: parsedInput.email,
    });

    await emailService.sendOneTimePasswordEmail(
      challenge.email,
      challenge.code,
      challenge.expiresAt
    );

    return {
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
    };
  });

export const verifyOneTimePasswordAction = actionClient
  .inputSchema(verifyOneTimePasswordSchema)
  .action(async ({ parsedInput }) => {
    const result = await verifyOneTimePasswordChallenge(parsedInput);

    return {
      challengeId: result.challengeId,
      verified: true as const,
      expiresAt: result.expiresAt.toISOString(),
    };
  });

export const getSelfSignupAccountStatusAction = actionClient
  .inputSchema(getSelfSignupAccountStatusSchema)
  .action(async ({ parsedInput }) => {
    const normalizedEmail = parsedInput.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    return {
      accountExists: !!existingUser,
    };
  });

export const createSelfSignupAction = actionClient
  .inputSchema(createSelfSignupSchema)
  .action(async ({ parsedInput }) => {
    let createdOrganization: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null = null;

    if (parsedInput.accountMode === 'new') {
      const passwordHash = await hash(parsedInput.password, 12);
      const normalizedEmail = parsedInput.email.trim().toLowerCase();

      await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (existingUser) {
          throw new Error(
            'Es existiert bereits ein Konto mit dieser E-Mail-Adresse.'
          );
        }

        await consumeVerifiedOneTimePasswordChallenge(
          {
            email: parsedInput.email,
            challengeId: parsedInput.challengeId,
          },
          tx
        );

        const organization = await createSelfSignupOrganization(tx, parsedInput);
        const roleIds = await getAssignableRoleIds(tx);

        await tx.user.create({
          data: {
            email: normalizedEmail,
            firstname: parsedInput.firstName,
            lastname: parsedInput.lastName,
            password: passwordHash,
            active_org: organization.id,
            user_organization_role: {
              create: roleIds.map((roleId) => ({
                org_id: organization.id,
                role_id: roleId,
              })),
            },
          },
        });

        createdOrganization = organization;
      });
    }

    if (parsedInput.accountMode === 'existing') {
      const normalizedEmail = parsedInput.email.trim().toLowerCase();

      await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            password: true,
          },
        });

        if (!existingUser?.password) {
          throw new Error(
            'Für diese E-Mail-Adresse konnte kein passwortbasiertes Konto gefunden werden.'
          );
        }

        const isPasswordValid = await compare(
          parsedInput.password,
          existingUser.password
        );

        if (!isPasswordValid) {
          throw new Error('Das eingegebene Passwort ist nicht korrekt.');
        }

        const organization = await createSelfSignupOrganization(tx, parsedInput);
        await addUserToOrganizationWithAllRoles(tx, existingUser.id, organization.id);
        createdOrganization = organization;
      });
    }

    if (parsedInput.accountMode === 'logged_in') {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        throw new Error(
          'Ihre Sitzung konnte nicht erkannt werden. Bitte melden Sie sich erneut an.'
        );
      }

      await prisma.$transaction(async (tx) => {
        const organization = await createSelfSignupOrganization(tx, parsedInput);
        await addUserToOrganizationWithAllRoles(
          tx,
          session.user.id,
          organization.id
        );
        createdOrganization = organization;
      });
    }

    return {
      success: true as const,
      message:
        'Vielen Dank für Ihre Anmeldung. Ihr Konto wurde erfolgreich erstellt.',
      organization: createdOrganization,
    };
  });
