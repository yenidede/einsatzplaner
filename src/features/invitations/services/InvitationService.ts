import prisma from '@/lib/prisma';
import { emailService } from '@/lib/email/EmailService';
import { randomBytes } from 'crypto';

export class InvitationService {
  /**
   * Erstellt eine neue Einladung und sendet die E-Mail
   */
  static async createInvitation(
    email: string,
    organizationId: string,
    invitedBy: string
  ) {
    // Prüfe ob User bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Prüfe ob User bereits in der Organisation ist
      const existingMembership = await prisma.user_organization_role.findFirst({
        where: {
          user_id: existingUser.id,
          org_id: organizationId
        }
      });

      if (existingMembership) {
        throw new Error('Benutzer ist bereits Mitglied dieser Organisation');
      }
    }

    // Prüfe ob bereits eine aktive Einladung existiert
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        org_id: organizationId,
        accepted: false,
        expires_at: {
          gt: new Date()
        }
      }
    });

    if (existingInvitation) {
      throw new Error('Es existiert bereits eine aktive Einladung für diese E-Mail-Adresse');
    }

    // Generiere Token
    const token = randomBytes(32).toString('hex');
    
    // Setze Ablaufzeit (7 Tage)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Hole Organisations- und Einlader-Daten
    const [organization, inviter] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true }
      }),
      prisma.user.findUnique({
        where: { id: invitedBy },
        select: { firstname: true, lastname: true }
      })
    ]);

    if (!organization || !inviter) {
      throw new Error('Organisation oder Einlader nicht gefunden');
    }

    // Finde Standard-Rolle für Einladungen
    const invitationRole = await prisma.role.findFirst({
      where: { name: 'Helfer' }
    });
    if (!invitationRole) {
      throw new Error('Standard-Rolle für Einladungen nicht gefunden');
    }

    // Erstelle Einladung in DB
    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        expires_at: expiresAt,
        invited_by: invitedBy,
        org_id: organizationId,
        role_id: invitationRole.id
      },
      include: {
        organization: {
          select: { name: true }
        },
        user: {
          select: { firstname: true, lastname: true }
        }
      }
    });

    // Sende E-Mail
    await emailService.sendInvitationEmail(
      email,
      `${inviter.firstname} ${inviter.lastname}`,
      organization.name,
      token
    );

    return {
      id: invitation.id,
      email: invitation.email,
      expires_at: invitation.expires_at,
      organization: organization.name
    };
  }

  /**
   * Validiert einen Einladungstoken
   */
  static async validateInvitation(token: string) {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        user: {
          select: { firstname: true, lastname: true }
        }
      }
    });

    if (!invitation) {
      throw new Error('Einladung nicht gefunden');
    }

    if (invitation.accepted) {
      throw new Error('Diese Einladung wurde bereits angenommen');
    }

    if (new Date() > invitation.expires_at) {
      throw new Error('Diese Einladung ist abgelaufen');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expires_at: invitation.expires_at.toISOString(),
      organization: invitation.organization,
      inviter: invitation.user
    };
  }

  /**
   * Akzeptiert eine Einladung und erstellt den User
   */
  static async acceptInvitation(
    token: string,
    userData: {
      firstname: string;
      lastname: string;
      password: string;
      phone?: string;
    }
  ) {
    // Validiere Einladung
    const invitation = await this.validateInvitation(token);

    // Prüfe ob E-Mail bereits registriert ist
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });

    if (existingUser) {
      throw new Error('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits');
    }

    // Finde Standard-Rolle für neue User
    const helperRole = await prisma.role.findFirst({
      where: { name: 'Helfer' }
    });

    if (!helperRole) {
      throw new Error('Standard-Rolle nicht gefunden');
    }

    // Erstelle User und verknüpfe mit Organisation
    const user = await prisma.$transaction(async (tx) => {
      // Erstelle User
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          firstname: userData.firstname,
          lastname: userData.lastname,
          password: userData.password, // sollte bereits gehashed sein
          phone: userData.phone,
        }
      });

      // Verknüpfe mit Organisation
      await tx.user_organization_role.create({
        data: {
          user_id: newUser.id,
          org_id: invitation.organization.id,
          role_id: helperRole.id,
          hasGetMailNotification: true
        }
      });

      // Markiere Einladung als angenommen
      await tx.invitation.update({
        where: { token },
        data: { accepted: true }
      });

      return newUser;
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname
      },
      organization: invitation.organization
    };
  }

  /**
   * Löscht abgelaufene Einladungen
   */
  static async cleanupExpiredInvitations() {
    const result = await prisma.invitation.deleteMany({
      where: {
        expires_at: {
          lt: new Date()
        },
        accepted: false
      }
    });

    console.log(`🧹 ${result.count} abgelaufene Einladungen gelöscht`);
    return result.count;
  }
}
