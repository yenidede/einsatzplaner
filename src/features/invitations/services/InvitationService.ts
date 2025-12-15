import prisma from "@/lib/prisma";
import { emailService } from "@/lib/email/EmailService";
import { randomBytes } from "crypto";

export class InvitationService {
  static async createInvitation(
    email: string,
    organizationId: string,
    invitedBy: string
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const user_in_org = await prisma.user_organization_role.findFirst({
        where: {
          user_id: existingUser.id,
          org_id: organizationId,
        },
      });

      if (user_in_org) {
        throw new Error("Benutzer ist bereits Mitglied dieser Organisation");
      }
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        org_id: organizationId,
        accepted: false,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      throw new Error(
        "Es existiert bereits eine aktive Einladung für diese E-Mail-Adresse"
      );
    }

    const token = randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [organization, inviter] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      }),
      prisma.user.findUnique({
        where: { id: invitedBy },
        select: { firstname: true, lastname: true },
      }),
    ]);

    if (!organization || !inviter) {
      throw new Error("Organisation oder Einlader nicht gefunden");
    }

    const invitationRole = await prisma.role.findFirst({
      where: { name: "Helfer" },
    });
    if (!invitationRole) {
      throw new Error("Standard-Rolle für Einladungen nicht gefunden");
    }

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        expires_at: expiresAt,
        invited_by: invitedBy,
        org_id: organizationId,
        role_id: invitationRole.id,
      },
      include: {
        organization: {
          select: { name: true },
        },
        user: {
          select: { firstname: true, lastname: true },
        },
      },
    });

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
      organization: organization.name,
    };
  }

  static async validateInvitation(token: string) {
    // Changed from findUnique to findFirst since token is no longer unique
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        accepted: false,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        user: {
          select: { firstname: true, lastname: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invitation) {
      throw new Error("Einladung nicht gefunden");
    }

    if (invitation.accepted) {
      throw new Error("Diese Einladung wurde bereits angenommen");
    }

    if (new Date() > invitation.expires_at) {
      throw new Error("Diese Einladung ist abgelaufen");
    }

    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expires_at: invitation.expires_at.toISOString(),
      organization: invitation.organization,
      inviter: invitation.user,
      role: invitation.role,
    };
  }

  static async acceptInvitation(
    token: string,
    userData: {
      firstname: string;
      lastname: string;
      password: string;
      phone?: string;
    }
  ) {
    const invitations = await prisma.invitation.findMany({
      where: {
        token,
        accepted: false,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invitations || invitations.length === 0) {
      throw new Error("Einladung nicht gefunden");
    }

    const firstInvitation = invitations[0];

    if (new Date() > firstInvitation.expires_at) {
      throw new Error("Diese Einladung ist abgelaufen");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: firstInvitation.email },
    });

    if (existingUser) {
      throw new Error(
        "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits"
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: firstInvitation.email,
          firstname: userData.firstname,
          lastname: userData.lastname,
          password: userData.password,
          phone: userData.phone,
          active_org: firstInvitation.organization.id,
        },
      });

      // Create user_organization_role for all invited roles
      await Promise.all(
        invitations.map((invitation) =>
          tx.user_organization_role.create({
            data: {
              user_id: newUser.id,
              org_id: invitation.org_id,
              role_id: invitation.role_id,
              hasGetMailNotification: true,
            },
          })
        )
      );

      // Mark all invitations as accepted
      await tx.invitation.updateMany({
        where: { token },
        data: { accepted: true },
      });

      return newUser;
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
      },
      organization: firstInvitation.organization,
      roles: invitations.map((inv) => inv.role),
    };
  }

  static async cleanupExpiredInvitations() {
    const result = await prisma.invitation.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
        accepted: false,
      },
    });
    return result.count;
  }

  static async sendReminderEmails(): Promise<number> {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get unique tokens for expiring invitations
    const expiringInvitations = await prisma.invitation.findMany({
      where: {
        accepted: false,
        expires_at: {
          gte: tomorrow,
          lte: twoDaysFromNow,
        },
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        user: {
          select: { firstname: true, lastname: true },
        },
      },
      distinct: ["token"], // Only get one invitation per token
    });

    let sentCount = 0;

    for (const invitation of expiringInvitations) {
      try {
        const inviterName = invitation.user
          ? `${invitation.user.firstname} ${invitation.user.lastname}`
          : "einem Teammitglied";

        await emailService.sendInvitationReminderEmail(
          invitation.email,
          inviterName,
          invitation.organization.name,
          invitation.token,
          invitation.expires_at
        );

        sentCount++;
      } catch (error) {
        console.error(`Failed to send reminder to ${invitation.email}:`, error);
      }
    }
    return sentCount;
  }
}
