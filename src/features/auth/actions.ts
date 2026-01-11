'use server';

import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import {
  getUserWithValidResetToken,
  resetUserPassword,
  getUserByEmail,
  updateUserResetToken,
  createUserWithOrgAndRoles,
} from '@/DataAccessLayer/user';
import { emailService } from '@/lib/email/EmailService';
import { actionClient } from '@/lib/safe-action';
import { formSchema as registerFormSchema } from './register-schema';
import prisma from '@/lib/prisma';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  newPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

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
      const [hashedPassword, invitations] = await Promise.all([
        hash(parsedInput.passwort, 12),
        prisma.invitation.findMany({
          where: {
            email: parsedInput.email,
            token: firstInvitation?.token,
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
      if (invitations.length === 0 || !firstInvitation) {
        throw new Error('Keine gültigen Einladungen gefunden');
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
      });
      await prisma.invitation.deleteMany({
        where: {
          email: parsedInput.email,
          token: firstInvitation.token,
        },
      });
      return {
        success: true,
        message: 'Account erfolgreich erstellt. Sie werden nun eingeloggt.',
      };
    } catch (error) {
      throw error;
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
