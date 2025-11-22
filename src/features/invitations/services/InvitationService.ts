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
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        user: {
          select: { firstname: true, lastname: true },
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
    const invitation = await this.validateInvitation(token);

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new Error(
        "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits"
      );
    }

    const helperRole = await prisma.role.findFirst({
      where: { name: "Helfer" },
    });

    if (!helperRole) {
      throw new Error("Standard-Rolle nicht gefunden");
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: invitation.email,
          firstname: userData.firstname,
          lastname: userData.lastname,
          password: userData.password, // should already be hashed
          phone: userData.phone,
        },
      });

      await tx.user_organization_role.create({
        data: {
          user_id: newUser.id,
          org_id: invitation.organization.id,
          role_id: helperRole.id,
          hasGetMailNotification: true,
        },
      });

      await tx.invitation.update({
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
      organization: invitation.organization,
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

    console.log(`${result.count} abgelaufene Einladungen gelöscht`);
    return result.count;
  }
}
