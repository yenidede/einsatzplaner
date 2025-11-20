import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  SuperAdmin: ["read:einsaetze","create:einsaetze","update:einsaetze","delete:einsaetze","manage:org", "users:manage"],
  Organisationsverwaltung: ["read:einsaetze","manage:org", "users:manage"],
  Einsatzverwaltung: ["read:einsaetze","create:einsaetze","update:einsaetze"],
  Helfer: ["read:einsaetze","join:einsaetze","leave:einsaetze"],
};

// Auth Guard für Server Components
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/signin');
  }

  const userId = session.user.id as string;

  // hole alle Zuordnungen mit Role-Info
  const rows = await prisma.user_organization_role.findMany({
    where: { user_id: userId },
    include: { role: { select: { id: true, name: true, abbreviation: true } } },
  });

  const orgIds = Array.from(new Set(rows.map(r => r.org_id)));
  const roleIds = Array.from(new Set(rows.map(r => r.role_id)));
  const roles = Array.from(new Set(rows.map(r => r.role?.name).filter(Boolean))) as string[];

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
  const hasRequiredRole = roles.some(role => userRoles.includes(role));

  if (!hasRequiredRole) {
    redirect('/unauthorized');
  }

  return session;
}

// Auth Guard mit Organisationsprüfung
export async function requireOrganization(orgId?: string) {
  const { session, userIds } = await requireAuth();

  const userOrgIds = userIds.orgIds || [];

  if (orgId && !userOrgIds.includes(orgId)) {
    redirect('/unauthorized');
  }

  return session;
}

// Vollständige User-Daten mit aktuellen Rollen laden
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/signin');
  }

  try {
    const user = await getUserByIdWithOrgAndRole(session.user.id);

    if (!user) {
      redirect('/signin');
    }

    return {
      session,
      user,
      // Alle UUIDs für die Session
      userIds: {
        userId: user.id,
        orgId: user.user_organization_role[0]?.org_id || null,
        roleId: user.user_organization_role[0]?.role_id || null,
      }
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    redirect('/signin');
  }
}

// Permission Checker
export function hasPermission(sessionOrRoleOrRoles: any, permission: string): boolean {
  // akzeptiert: session, role string, roles string[]
  let roles: string[] = [];

  if (!sessionOrRoleOrRoles) return false;

  // session übergeben?
  if (sessionOrRoleOrRoles?.user) {
    roles = sessionOrRoleOrRoles.user.roles ?? (sessionOrRoleOrRoles.user.role ? [sessionOrRoleOrRoles.user.role] : []);
  } else if (Array.isArray(sessionOrRoleOrRoles)) {
    roles = sessionOrRoleOrRoles;
  } else if (typeof sessionOrRoleOrRoles === "string") {
    roles = [sessionOrRoleOrRoles];
  }

  // prüfe, ob irgendeine Rolle die Permission hat
  return roles.some(r => (ROLE_PERMISSION_MAP[r] ?? []).includes(permission));
}

// API Route Auth Helper
export async function validateApiAuth(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Nicht authentifiziert', status: 401 };
  }

  return { session, user: session.user };
}

// API Route Auth mit Berechtigung
export async function validateApiAuthWithPermission(request: Request, permission: string) {
  const authResult = await validateApiAuth(request);

  if ('error' in authResult) {
    return authResult;
  }

  if (!hasPermission(authResult.session, permission)) {
    return { error: 'Keine Berechtigung', status: 403 };
  }

  return authResult;
}
