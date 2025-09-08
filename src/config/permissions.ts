import type { RoleName } from '@/types/auth';

export const PERMISSIONS: Record<string, RoleName[]> = {
  // Profile Management
  'profile:read': ['Helfer', 'Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'profile:update': ['Helfer', 'Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  
  // Einsatz Management
  'einsaetze:read': ['Helfer', 'Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'einsaetze:join': ['Helfer', 'Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'einsaetze:create': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'einsaetze:update': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'einsaetze:delete': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'einsaetze:manage': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  
  // User Management
  'users:invite': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'users:read': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'users:manage': ['Organisationsverwaltung', 'Superadmin'],
  'users:update': ['Organisationsverwaltung', 'Superadmin'],
  'users:delete': ['Superadmin'],
  
  // Organization Management
  'organization:read': ['Helfer', 'Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'organization:update': ['Organisationsverwaltung', 'Superadmin'],
  'organization:manage': ['Organisationsverwaltung', 'Superadmin'],
  'organization:delete': ['Superadmin'],
  
  // Dashboard & Analytics
  'dashboard:read': ['Helfer', 'Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'analytics:read': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  
  // Templates (falls vorhanden)
  'templates:read': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'templates:create': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'templates:update': ['Einsatzverwaltung', 'Organisationsverwaltung', 'Superadmin'],
  'templates:delete': ['Organisationsverwaltung', 'Superadmin'],
  
  // System Administration
  'system:manage': ['Superadmin'],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: RoleName): PermissionKey[] {
  return Object.entries(PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(role))
    .map(([permission]) => permission as PermissionKey);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: RoleName, permission: PermissionKey): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles?.includes(role) || false;
}

/**
 * Check if user is admin role
 */
export function isAdminRole(role: RoleName): boolean {
  return role === 'Organisationsverwaltung' || role === 'Superadmin';
}

/**
 * Check if user is manager role (can manage some things)
 */
export function isManagerRole(role: RoleName): boolean {
  return role === 'Einsatzverwaltung' || role === 'Organisationsverwaltung' || role === 'Superadmin';
}

/**
 * Get role hierarchy level (higher = more permissions)
 */
export function getRoleLevel(role: RoleName): number {
  switch (role) {
    case 'Helfer': return 1;
    case 'Einsatzverwaltung': return 2;
    case 'Organisationsverwaltung': return 3;
    case 'Superadmin': return 4;
    default: return 0;
  }
}

/**
 * Check if role A has higher or equal permissions than role B
 */
export function roleHasHigherOrEqualPermissions(roleA: RoleName, roleB: RoleName): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}