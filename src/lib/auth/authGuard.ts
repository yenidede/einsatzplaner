import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getUserRolesInOrganization } from '@/DataAccessLayer/user';
import { authOptions } from '@/lib/auth.config';
import { Session } from 'next-auth';
import { permission, PermissionType } from './permissions';

export const ROLE_NAME_MAP = {
  Superadmin: '559ed0cd-2644-47dd-9fb8-c6e333589e05',
  Helfer: '90f7c6ce-f696-419c-9a29-4c70c3ab4cef',
  Einsatzverwaltung: 'd54836b9-a1ff-4dd8-8633-20c98378aa87',
  Organisationsverwaltung: 'd8c4c6ad-10bc-4947-bf16-1652f55298cc',
};

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  Superadmin: [
    // Einsätze
    permission('einsaetze', 'read'),
    permission('einsaetze', 'create'),
    permission('einsaetze', 'update'),
    permission('einsaetze', 'delete'),
    permission('einsaetze', 'join'),
    permission('einsaetze', 'leave'),
    permission('einsaetze', 'manage_assignments'),
    // Users
    permission('users', 'read'),
    permission('users', 'create'),
    permission('users', 'update'),
    permission('users', 'delete'),
    permission('users', 'manage'),
    permission('users', 'invite'),
    // Organization
    permission('organization', 'read'),
    permission('organization', 'update'),
    permission('organization', 'delete'),
    permission('organization', 'manage'),
    // Roles
    permission('roles', 'read'),
    permission('roles', 'create'),
    permission('roles', 'update'),
    permission('roles', 'delete'),
    permission('roles', 'assign'),
    // Settings
    permission('settings', 'read'),
    permission('settings', 'update'),
    // Dashboard
    permission('dashboard', 'read'),
    permission('analytics', 'read'),
  ],

  Organisationsverwaltung: [
    // Einsätze (nur lesen)
    permission('einsaetze', 'read'),

    // Users
    permission('users', 'read'),
    permission('users', 'create'),
    permission('users', 'update'),
    permission('users', 'invite'),
    permission('users', 'manage'),

    // Organization
    permission('organization', 'read'),
    permission('organization', 'update'),
    // Roles
    permission('roles', 'read'),
    permission('roles', 'assign'),

    // Settings
    permission('settings', 'read'),
    permission('settings', 'update'),

    // Dashboard
    permission('dashboard', 'read'),
  ],

  Einsatzverwaltung: [
    // Einsätze
    permission('einsaetze', 'read'),
    permission('einsaetze', 'create'),
    permission('einsaetze', 'update'),
    permission('einsaetze', 'delete'),
    permission('einsaetze', 'manage_assignments'),
    // Users (read-only)
    permission('users', 'read'),
    permission('templates', 'read'),

    // Dashboard
    permission('dashboard', 'read'),
  ],

  Helfer: [
    // Einsätze
    permission('einsaetze', 'read'),
    permission('einsaetze', 'join'),
    permission('einsaetze', 'leave'),

    // Dashboard
    permission('dashboard', 'read'),
  ],
};

export type ExtendedSession = Session & {
  user: Session['user'] & {
    roles?: string[];
    roleIds?: string[];
    orgIds?: string[];
    orgId?: string;
  };
};

// Auth Guard für Server Components
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/signin');
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

export async function hasPermission(
  session: Session,
  permission: PermissionType,
  orgId?: string
): Promise<boolean> {
  if (!session?.user?.id) return false;

  const targetOrgId = orgId || session.user.activeOrganization?.id;

  if (!targetOrgId) {
    console.warn('No organization ID available');
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

export function hasPermissionFromSession(
  session: ExtendedSession,
  permission: PermissionType,
  orgId?: string
): boolean {
  if (!session?.user?.id) {
    return false;
  }
  const userRoles = session.user.roles || [];

  return userRoles.some((roleName) => {
    const rolePermissions = ROLE_PERMISSION_MAP[roleName] ?? [];
    return rolePermissions.includes(permission);
  });
}

export async function hasAllPermissions(
  session: Session,
  permissions: PermissionType[],
  orgId?: string
): Promise<boolean> {
  for (const permission of permissions) {
    const result = await hasPermission(session, permission, orgId);
    if (!result) return false;
  }
  return true;
}
