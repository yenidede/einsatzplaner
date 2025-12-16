"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { emailService } from "@/lib/email/EmailService";
import { hasPermission } from "@/lib/auth/authGuard";
import { revalidatePath } from "next/cache";

async function checkUserSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Nicht authentifiziert");
  return session;
}

export async function createInvitationAction(data: {
  email: string;
  organizationId: string;
  roleIds: string[];
}) {
  try {
    const session = await checkUserSession();

    if (
      !data.email ||
      !data.organizationId ||
      !data.roleIds ||
      data.roleIds.length === 0
    ) {
      throw new Error("Ungültige Eingabedaten");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error("Ungültige E-Mail-Adresse");
    }

    const inviter = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        user_organization_role: {
          where: { org_id: data.organizationId },
          include: { role: true },
        },
      },
    });

    if (!inviter) {
      throw new Error("Benutzer nicht gefunden");
    }

    const canInvite = await hasPermission(session, "users:invite");

    if (!canInvite) {
      const roleNames = inviter.user_organization_role.map(
        (uor) => uor.role?.name || ""
      );
      throw new Error(
        `Keine Berechtigung zum Einladen von Benutzern. Ihre Rollen: ${roleNames.join(
          ", "
        )}`
      );
    }

    // Organisation existiert prüfen
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    });

    if (!organization) {
      throw new Error("Organisation nicht gefunden");
    }

    // Prüfen ob User bereits in Organisation
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        user_organization_role: {
          where: { org_id: data.organizationId },
        },
      },
    });

    if (existingUser && existingUser.user_organization_role.length > 0) {
      throw new Error("Benutzer ist bereits Mitglied dieser Organisation");
    }

    // Prüfen ob bereits eine offene Einladung existiert
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        org_id: data.organizationId,
        expires_at: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new Error(
        "Es existiert bereits eine offene Einladung für diese E-Mail-Adresse"
      );
    }

    const token = crypto.randomBytes(32).toString("hex");

    // Einladungen für alle ausgewählten Rollen erstellen
    // Wir erstellen mehrere invitation records, eine pro Rolle
    const invitations = await Promise.all(
      data.roleIds.map((roleId) =>
        prisma.invitation.create({
          data: {
            email: data.email,
            org_id: data.organizationId,
            role_id: roleId,
            invited_by: inviter.id,
            token: token, // Gleicher Token für alle Rollen
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            accepted: false,
          },
          include: {
            organization: true,
            role: true,
          },
        })
      )
    );

    // E-Mail senden
    try {
      const inviterName =
        inviter.firstname && inviter.lastname
          ? `${inviter.firstname} ${inviter.lastname}`
          : inviter.email;

      await emailService.sendInvitationEmail(
        data.email,
        inviterName || "Unbekannt",
        organization.name,
        token
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Lösche alle erstellten Einladungen
      await prisma.invitation.deleteMany({
        where: { token: token },
      });
      throw new Error(
        "Einladung erstellt, aber E-Mail konnte nicht gesendet werden. Einladung wurde zurückgezogen."
      );
    }

    // Revalidate paths
    revalidatePath(`/organization/${data.organizationId}/manage`);

    return {
      success: true,
      message: "Einladung erfolgreich erstellt",
      invitation: {
        id: invitations[0].id,
        email: invitations[0].email,
        expires_at: invitations[0].expires_at,
        roles: invitations.map((inv) => inv.role.name),
      },
    };
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler beim Erstellen der Einladung");
  }
}

export async function acceptInvitationAction(token: string) {
  try {
    const session = await checkUserSession();

    if (!token) {
      throw new Error("Token ist erforderlich");
    }

    const invitations = await prisma.invitation.findMany({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitations || invitations.length === 0) {
      throw new Error("Ungültiger Einladungstoken");
    }

    const firstInvitation = invitations[0];

    // Validierungen
    if (firstInvitation.expires_at < new Date()) {
      throw new Error("Die Einladung ist abgelaufen");
    }

    if (firstInvitation.accepted) {
      throw new Error("Die Einladung wurde bereits angenommen");
    }

    if (firstInvitation.email !== session.user.email) {
      throw new Error("E-Mail-Adresse stimmt nicht überein");
    }

    await Promise.all(
      invitations.map((invitation) =>
        prisma.user_organization_role.create({
          data: {
            user_id: session.user.id,
            org_id: invitation.org_id,
            role_id: invitation.role_id,
          },
        })
      )
    );

    await prisma.invitation.deleteMany({
      where: { token },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        picture_url: true,
        active_org: true,
      },
    });

    const userOrgRoles = await prisma.user_organization_role.findMany({
      where: { user_id: session.user.id },
      select: {
        org_id: true,
        role_id: true,
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
      },
    });

    const orgIds = [...new Set(userOrgRoles.map((uor) => uor.org_id))];
    const roleIds = [...new Set(userOrgRoles.map((uor) => uor.role_id))];

    let activeOrganization = null;

    // Aktive Organisation setzen
    if (updatedUser?.active_org) {
      const activeOrgData = userOrgRoles.find(
        (uor) => uor.org_id === updatedUser.active_org
      );
      if (activeOrgData) {
        activeOrganization = activeOrgData.organization;
      }
    }

    // Falls keine aktive Organisation, setze die neue Organisation als aktiv
    if (!activeOrganization) {
      activeOrganization = firstInvitation.organization;

      await prisma.user.update({
        where: { id: session.user.id },
        data: { active_org: firstInvitation.org_id },
      });
    }

    // Revalidate wichtige Pfade
    revalidatePath("/");
    revalidatePath(`/organization/${firstInvitation.org_id}`);

    return {
      success: true,
      message: "Einladung erfolgreich angenommen",
      sessionUpdate: {
        user: {
          ...session.user,
          orgIds,
          roleIds,
          activeOrganization,
        },
      },
      addedRoles: invitations.map((inv) => inv.role.name),
    };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler beim Annehmen der Einladung");
  }
}

export async function verifyInvitationAction(token: string) {
  try {
    if (!token) {
      throw new Error("Token ist erforderlich");
    }
    const invitations = await prisma.invitation.findMany({
      where: { token },
      include: {
        organization: { select: { name: true } },
        role: { select: { name: true } },
      },
    });
    if (!invitations || invitations.length === 0) {
      throw new Error("Einladung nicht gefunden");
    }

    const firstInvitation = invitations[0];

    if (firstInvitation.expires_at < new Date()) {
      throw new Error("Einladung ist abgelaufen");
    }

    if (firstInvitation.accepted) {
      throw new Error("Einladung wurde bereits angenommen");
    }

    const inviter = await prisma.user.findUnique({
      where: { id: firstInvitation.invited_by },
      select: { firstname: true, lastname: true, email: true },
    });

    const inviterName =
      inviter?.firstname && inviter?.lastname
        ? `${inviter.firstname} ${inviter.lastname}`
        : inviter?.email || "Unbekannt";

    const roleNames = invitations
      .map((inv) => inv.role?.name)
      .filter(Boolean)
      .join(", ");

    return {
      id: firstInvitation.id,
      email: firstInvitation.email,
      organizationName: firstInvitation.organization?.name || "Organisation",
      roleName: roleNames || "Helfer",
      roles: invitations.map((inv) => ({
        id: inv.role_id,
        name: inv.role?.name || "Unbekannt",
      })),
      inviterName: inviterName,
      expiresAt: firstInvitation.expires_at.toISOString(),
    };
  } catch (error) {
    console.error("Error verifying invitation:", error);
    throw error instanceof Error
      ? error
      : new Error("Fehler bei der Überprüfung der Einladung");
  }
}
