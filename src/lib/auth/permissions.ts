export const PERMISSIONS = {
  einsaetze: [
    'read',
    'create',
    'update',
    'delete',
    'join',
    'leave',
    'manage_assignments',
  ],
  users: ['read', 'create', 'update', 'delete', 'manage', 'invite'],
  organization: ['read', 'update', 'delete', 'manage'],
  roles: ['read', 'create', 'update', 'delete', 'assign'],
  settings: ['read', 'update'],
  dashboard: ['read'],
  analytics: ['read'],
  templates: ['read', 'create', 'update', 'delete'],
} as const;

export type ResourceType = keyof typeof PERMISSIONS;

export type ActionType<R extends ResourceType> =
  (typeof PERMISSIONS)[R][number];

export type PermissionType = {
  [R in ResourceType]: `${R}:${ActionType<R>}`;
}[ResourceType];
export function permission<R extends ResourceType>(
  resource: R,
  action: ActionType<R>
): `${R}:${ActionType<R>}` {
  return `${resource}:${action}`;
}
