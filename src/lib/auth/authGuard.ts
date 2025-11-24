import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  getUserByIdWithOrgAndRole,
  getUserRolesInOrganization,
} from "@/DataAccessLayer/user";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Session } from "next-auth";

// ✅ ROLE PERMISSION MAP - Single Source of Truth
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  Superadmin: [
    // Einsätze
    "einsaetze:read",
    "einsaetze:create",
    "einsaetze:update",
    "einsaetze:delete",
    "einsaetze:join",
    "einsaetze:leave",
    "einsaetze:manage_assignments",

    // Users
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "users:manage",
    "users:invite",

    // Organization
    "organization:read",
    "organization:update",
    "organization:delete",
    "organization:manage",

    // Roles
    "roles:read",
    "roles:create",
    "roles:update",
    "roles:delete",
    "roles:assign",

    // Settings
    "settings:read",
    "settings:update",

    // Dashboard
    "dashboard:read",
    "analytics:read",
  ],

  Organisationsverwaltung: [
    // Einsätze (nur lesen)
    "einsaetze:read",

    // Users
    "users:read",
    "users:create",
    "users:update",
    "users:invite",
    "users:manage",

    // Organization
    "organization:read",
    "organization:update",

    // Roles
    "roles:read",
    "roles:assign",

    // Settings
    "settings:read",
    "settings:update",

    // Dashboard
    "dashboard:read",
  ],

  Einsatzverwaltung: [
    // Einsätze
    "einsaetze:read",
    "einsaetze:create",
    "einsaetze:update",
    "einsaetze:delete",
    "einsaetze:manage_assignments",

    // Users (read-only)
    "users:read",

    // Dashboard
    "dashboard:read",
  ],

  Helfer: [
    // Einsätze
    "einsaetze:read",
    "einsaetze:join",
    "einsaetze:leave",

    // Dashboard
    "dashboard:read",
  ],
};

// ✅ NEUE METHODE: Get all permissions for a role
export function getRolePermissions(roleName: string): string[] {
  return ROLE_PERMISSION_MAP[roleName] || [];
}

// ✅ NEUE METHODE: Get all permissions for multiple roles
export function getMultipleRolesPermissions(roleNames: string[]): string[] {
  const allPermissions = new Set<string>();

  roleNames.forEach((roleName) => {
    const permissions = ROLE_PERMISSION_MAP[roleName] || [];
    permissions.forEach((perm) => allPermissions.add(perm));
  });

  return Array.from(allPermissions);
}

// ✅ NEUE METHODE: Check if role has specific permission
export function roleHasPermission(
  roleName: string,
  permission: string
): boolean {
  const permissions = ROLE_PERMISSION_MAP[roleName] || [];
  return permissions.includes(permission);
}

export function getRolesWithPermission(permission: string): string[] {
  return Object.entries(ROLE_PERMISSION_MAP)
    .filter(([_, permissions]) => permissions.includes(permission))
    .map(([roleName, _]) => roleName);
}

// ✅ NEUE METHODE: Get user's permissions from session (ohne DB Query)
export function getUserPermissionsFromSession(session: Session): string[] {
  if (!session?.user?.roles) return [];

  return getMultipleRolesPermissions(session.user.roles);
}

// ✅ NEUE METHODE: Get user's permissions from DB
export async function getUserPermissions(
  userId: string,
  orgId?: string
): Promise<string[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.id !== userId) {
    return [];
  }

  const targetOrgId = orgId || session.user.activeOrganization?.id;

  if (!targetOrgId) {
    return [];
  }

  const roles = await getUserRolesInOrganization(userId, targetOrgId);
  const roleNames = roles.map((r) => r.role.name);

  return getMultipleRolesPermissions(roleNames);
}

// Auth Guard für Server Components
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = session.user.id as string;

  const rows = await prisma.user_organization_role.findMany({
    where: { user_id: userId },
    include: { role: { select: { id: true, name: true, abbreviation: true } } },
  });

  const orgIds = Array.from(new Set(rows.map((r) => r.org_id)));
  const roleIds = Array.from(new Set(rows.map((r) => r.role_id)));
  const roles = Array.from(
    new Set(rows.map((r) => r.role?.name).filter(Boolean))
  ) as string[];

  const extendedSession = {
    ...session,
    user: {
      ...session.user,
      roles,
      roleIds,
      orgIds,
      orgId: orgIds.length === 1 ? orgIds[0] : undefined,
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

// ✅ Permission Check - mit DB Query
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

  return roles.some((r) =>
    (ROLE_PERMISSION_MAP[r.role.name] ?? []).includes(permission)
  );
}

// ✅ Permission Check - ohne DB Query (schneller, nutzt Session)
export function hasPermissionFromSession(
  session: Session,
  permission: string
): boolean {
  if (!session?.user?.roles) return false;

  return session.user.roles.some((roleName) =>
    (ROLE_PERMISSION_MAP[roleName] ?? []).includes(permission)
  );
}

// ✅ Check multiple permissions (user must have ALL)
export async function hasAllPermissions(
  session: Session,
  permissions: string[],
  orgId?: string
): Promise<boolean> {
  for (const permission of permissions) {
    const result = await hasPermission(session, permission, orgId);
    if (!result) return false;
  }
  return true;
}

// ✅ Check multiple permissions (user must have AT LEAST ONE)
export async function hasAnyPermission(
  session: Session,
  permissions: string[],
  orgId?: string
): Promise<boolean> {
  for (const permission of permissions) {
    const result = await hasPermission(session, permission, orgId);
    if (result) return true;
  }
  return false;
}

// API Route Auth Helper
export async function validateApiAuth(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Nicht authentifiziert", status: 401 };
  }

  return { session, user: session.user };
}

// ✅ API Route Auth mit Berechtigung
export async function validateApiAuthWithPermission(
  request: Request,
  permission: string,
  orgId?: string
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Nicht authentifiziert", status: 401 };
  }

  const hasPermissionResult = await hasPermission(session, permission, orgId);

  if (!hasPermissionResult) {
    return { error: "Keine Berechtigung", status: 403 };
  }

  return { session, user: session.user };
}

// ✅ API Route Auth mit mehreren Permissions (alle erforderlich)
export async function validateApiAuthWithAllPermissions(
  request: Request,
  permissions: string[],
  orgId?: string
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Nicht authentifiziert", status: 401 };
  }

  const result = await hasAllPermissions(session, permissions, orgId);

  if (!result) {
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

// ✅ Server Component Helper - require multiple permissions
export async function requireAllPermissions(
  permissions: string[],
  orgId?: string
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const result = await hasAllPermissions(session, permissions, orgId);

  if (!result) {
    redirect("/unauthorized");
  }

  return session;
}
