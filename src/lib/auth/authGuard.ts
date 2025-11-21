import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  getUserByIdWithOrgAndRole,
  getUserRolesInOrganization,
} from "@/DataAccessLayer/user";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Session } from "next-auth";

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  SuperAdmin: [
    "read:einsaetze",
    "create:einsaetze",
    "update:einsaetze",
    "delete:einsaetze",
    "manage:org",
    "users:manage",
  ],
  Organisationsverwaltung: ["read:einsaetze", "manage:org", "users:manage"],
  Einsatzverwaltung: ["read:einsaetze", "create:einsaetze", "update:einsaetze"],
  Helfer: ["read:einsaetze", "join:einsaetze", "leave:einsaetze"],
};

// Auth Guard für Server Components
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = session.user.id as string;

  // hole alle Zuordnungen mit Role-Info
  const rows = await prisma.user_organization_role.findMany({
    where: { user_id: userId },
    include: { role: { select: { id: true, name: true, abbreviation: true } } },
  });

  const orgIds = Array.from(new Set(rows.map((r) => r.org_id)));
  const roleIds = Array.from(new Set(rows.map((r) => r.role_id)));
  const roles = Array.from(
    new Set(rows.map((r) => r.role?.name).filter(Boolean))
  ) as string[];

  // erweitere session.user für Kompatibilität (clientseitig kann session.user.roles lesen)
  const extendedSession = {
    ...session,
    user: {
      ...session.user,
      roles,
      roleIds,
      orgIds,
      orgId: orgIds.length === 1 ? orgIds[0] : undefined, // fallback für alten code
    },
  };

  return {
    session: extendedSession,
    userIds: {
      userId,
      orgIds,
      roleIds,
      roles,
      orgId: orgIds.length === 1 ? orgIds[0] : undefined,
    },
  };
}

// Auth Guard mit Rollenprüfung
export async function requireRole(requiredRoles: string | string[]) {
  const { session, userIds } = await requireAuth();

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const userRoles = userIds.roles || [];

  // Prüfe, ob User mindestens eine der benötigten Rollen hat
  const hasRequiredRole = roles.some((role) => userRoles.includes(role));

  if (!hasRequiredRole) {
    redirect("/unauthorized");
  }

  return session;
}

// Auth Guard mit Organisationsprüfung
export async function requireOrganization(orgId?: string) {
  const { session, userIds } = await requireAuth();

  const userOrgIds = userIds.orgIds || [];

  if (orgId && !userOrgIds.includes(orgId)) {
    redirect("/unauthorized");
  }

  return session;
}

// Vollständige User-Daten mit aktuellen Rollen laden
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  try {
    const user = await getUserByIdWithOrgAndRole(session.user.id);

    if (!user) {
      redirect("/signin");
    }

    return {
      session,
      user,
      // Alle UUIDs für die Session
      userIds: {
        userId: user.id,
        orgId: user.user_organization_role[0]?.org_id || null,
        roleId: user.user_organization_role[0]?.role_id || null,
      },
    };
  } catch (error) {
    console.error("Error loading user data:", error);
    redirect("/signin");
  }
}

export async function hasPermission(
  session: Session,
  permission: string,
  orgId?: string
): Promise<boolean> {
  if (!session?.user?.id) return false;

  const targetOrgId = orgId || session.user.activeOrganization?.id;

  if (!targetOrgId) {
    console.warn("No organization ID available");
    return false;
  }

  const roles = await getUserRolesInOrganization(session.user.id, targetOrgId);

  if (roles.length === 0) {
    console.warn(`User has no roles in org ${targetOrgId}`);
    return false;
  }

  console.log(roles.map((r) => r.role.name));

  return roles.some((r) =>
    (ROLE_PERMISSION_MAP[r.role.name] ?? []).includes(permission)
  );
}
/* 
export function hasPermissionFromSession(
  session: Session,
  permission: string
): boolean {
  if (!session?.user?.roleIds) return false;

  // ✅ Prüfe direkt gegen die Rollen in der Session
  return session.user.roleIds.some((roleId) =>
    (ROLE_PERMISSION_MAP[roleId.] ?? []).includes(permission)
  );
}
 */
// API Route Auth Helper
export async function validateApiAuth(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Nicht authentifiziert", status: 401 };
  }

  return { session, user: session.user };
}

// ✅ API Route Auth mit Berechtigung - VEREINFACHT
export async function validateApiAuthWithPermission(
  request: Request,
  permission: string,
  orgId?: string // ✅ Optional
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Nicht authentifiziert", status: 401 };
  }

  // ✅ Nutze neue hasPermission-Funktion
  const hasPermissionResult = await hasPermission(session, permission, orgId);

  if (!hasPermissionResult) {
    return { error: "Keine Berechtigung", status: 403 };
  }

  return { session, user: session.user };
}

// ✅ Server Component Helper - mit Permission Check
export async function requirePermission(permission: string, orgId?: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const hasPermissionResult = await hasPermission(session, permission, orgId);

  if (!hasPermissionResult) {
    redirect("/unauthorized");
  }

  return session;
}
