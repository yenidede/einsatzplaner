// src/hooks/use-permission-guard.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { PermissionType } from '@/lib/auth/permissions';
import {
  ROLE_NAME_MAP,
  ROLE_ID_MAP,
  ROLE_PERMISSION_MAP,
} from '@/lib/auth/authGuard';

interface UsePermissionGuardOptions {
  requiredPermissions?: PermissionType[];
  requireAll?: boolean;
  redirectTo?: string;
  customRedirect?: (userRoleIds: string[]) => string | null;
}

interface UsePermissionGuardResult {
  isAuthorized: boolean;
  isLoading: boolean;
  session: ReturnType<typeof useSession>['data'];
}

export function usePermissionGuard(
  options: UsePermissionGuardOptions = {}
): UsePermissionGuardResult {
  const { requiredPermissions, requireAll, redirectTo, customRedirect } =
    options;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const hasCheckedRef = useRef(false);
  const lastStatusRef = useRef(status);

  const userPermissions = useMemo(() => {
    if (!session?.user?.roleIds) return [];
    const roleNames = session.user.roleIds
      .map((roleId) => ROLE_ID_MAP[roleId])
      .filter(Boolean);
    return roleNames.flatMap((roleName) => ROLE_PERMISSION_MAP[roleName] ?? []);
  }, [session?.user?.roleIds]);

  const permissionsKey = useMemo(
    () => JSON.stringify(requiredPermissions),
    [requiredPermissions]
  );

  useEffect(() => {
    if (lastStatusRef.current !== status) {
      hasCheckedRef.current = false;
      lastStatusRef.current = status;
    }

    if (hasCheckedRef.current) return;

    if (status === 'loading') return;

    hasCheckedRef.current = true;

    if (status === 'unauthenticated') {
      router.replace('/signin');
      return;
    }

    if (status === 'authenticated' && session) {
      const userRoleIds = session.user?.roleIds || [];
      const parsedPermissions: PermissionType[] = requiredPermissions || [];

      if (!parsedPermissions || parsedPermissions.length === 0) {
        if (userRoleIds.length === 0) {
          router.replace(redirectTo || '/signin');
          return;
        }
        setIsAuthorized(true);
        return;
      }

      const hasPermission = requireAll
        ? parsedPermissions.every((perm) => userPermissions.includes(perm))
        : parsedPermissions.some((perm) => userPermissions.includes(perm));

      if (!hasPermission) {
        if (customRedirect) {
          const redirectPath = customRedirect(userRoleIds);
          if (redirectPath) {
            router.replace(redirectPath);
            return;
          }
        }

        if (redirectTo) {
          router.replace(redirectTo);
          return;
        }

        if (userRoleIds.includes(ROLE_NAME_MAP['Helfer'])) {
          router.replace('/helferansicht');
        } else {
          router.replace('/');
        }
        return;
      }

      setIsAuthorized(true);
    }
  }, [status, session?.user?.id, userPermissions, permissionsKey, requireAll]);

  return {
    isAuthorized,
    isLoading: status === 'loading',
    session,
  };
}

export function useHasPermission(permission: PermissionType): boolean {
  const { data: session } = useSession();

  const userPermissions = useMemo(() => {
    if (!session?.user?.roleIds) return [];
    const roleNames = session.user.roleIds
      .map((roleId) => ROLE_ID_MAP[roleId])
      .filter(Boolean);
    return roleNames.flatMap((roleName) => ROLE_PERMISSION_MAP[roleName] ?? []);
  }, [session?.user?.roleIds]);

  return userPermissions.includes(permission);
}

export function useHasAnyPermission(permissions: PermissionType[]): boolean {
  const { data: session } = useSession();

  const userPermissions = useMemo(() => {
    if (!session?.user?.roleIds) return [];
    const roleNames = session.user.roleIds
      .map((roleId) => ROLE_ID_MAP[roleId])
      .filter(Boolean);
    return roleNames.flatMap((roleName) => ROLE_PERMISSION_MAP[roleName] ?? []);
  }, [session?.user?.roleIds]);

  return permissions.some((perm) => userPermissions.includes(perm));
}

export function useHasAllPermissions(permissions: PermissionType[]): boolean {
  const { data: session } = useSession();

  const userPermissions = useMemo(() => {
    if (!session?.user?.roleIds) return [];
    const roleNames = session.user.roleIds
      .map((roleId) => ROLE_ID_MAP[roleId])
      .filter(Boolean);
    return roleNames.flatMap((roleName) => ROLE_PERMISSION_MAP[roleName] ?? []);
  }, [session?.user?.roleIds]);

  return permissions.every((perm) => userPermissions.includes(perm));
}
