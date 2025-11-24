"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { AuthUser, RoleName } from "@/types/auth";

export function useAuth() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      if (status === "authenticated" && session?.user?.email) {
        try {
          const response = await fetch("/api/auth/me");
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else if (status === "unauthenticated") {
        setUser(null);
        setLoading(false);
      }
    }

    fetchUserData();
  }, [session, status]);

  const hasPermission = (permission: string): boolean => {
    if (!user?.allPermissions) return false;
    return user.allPermissions.includes(permission);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user?.allPermissions) return false;
    return permissions.every((perm) => user.allPermissions.includes(perm));
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user?.allPermissions) return false;
    return permissions.some((perm) => user.allPermissions.includes(perm));
  };

  const hasRole = (role: RoleName): boolean => {
    if (!user?.allRoles) return false;
    return user.allRoles.includes(role);
  };

  const hasAllRoles = (roles: RoleName[]): boolean => {
    if (!user?.allRoles) return false;
    return roles.every((role) => user.allRoles.includes(role));
  };

  const hasAnyRole = (roles: RoleName[]): boolean => {
    if (!user?.allRoles) return false;
    return roles.some((role) => user.allRoles.includes(role));
  };

  const currentOrganization = user?.currentOrganization || null;

  const currentRole = user?.currentRole || null;

  const organizations = user?.organizations || [];

  const allPermissions = user?.allPermissions || [];

  const allRoles = user?.allRoles || [];

  const isAuthenticated = status === "authenticated" && !!user;

  const isSuperadmin = hasRole("Superadmin");

  const isOrgAdmin = hasRole("Organisationsverwaltung");

  const isEinsatzAdmin = hasRole("Einsatzverwaltung");

  const isHelper = hasRole("Helfer");

  const canManageEinsaetze = hasAnyPermission([
    "einsaetze:create",
    "einsaetze:update",
    "einsaetze:delete",
  ]);

  const canManageUsers = hasAnyPermission([
    "users:create",
    "users:update",
    "users:delete",
    "users:manage",
  ]);

  const canManageOrganization = hasAnyPermission([
    "organization:update",
    "organization:manage",
  ]);

  return {
    // User Data
    user,
    session,

    // Loading State
    loading,
    isLoading: loading || status === "loading",

    // Auth Status
    isAuthenticated,
    isUnauthenticated: status === "unauthenticated",

    // Role Checks
    hasRole,
    hasAllRoles,
    hasAnyRole,
    isSuperadmin,
    isOrgAdmin,
    isEinsatzAdmin,
    isHelper,

    // Permission Checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,

    // Capability Checks (shortcuts)
    canManageEinsaetze,
    canManageUsers,
    canManageOrganization,

    // Current Context
    currentOrganization,
    currentRole,
    currentOrgId: user?.currentOrgId || null,

    // All Data
    organizations,
    allPermissions,
    allRoles,
    allRoleIds: user?.allRoleIds || [],
  };
}

export function usePermission(permission: string) {
  const { hasPermission, loading } = useAuth();
  return {
    hasPermission: hasPermission(permission),
    loading,
  };
}

export function useRole(role: RoleName) {
  const { hasRole, loading } = useAuth();
  return {
    hasRole: hasRole(role),
    loading,
  };
}

export function usePermissions(permissions: string[], requireAll = true) {
  const { hasAllPermissions, hasAnyPermission, loading } = useAuth();

  return {
    hasPermissions: requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions),
    loading,
  };
}
export function useRoles(roles: RoleName[], requireAll = true) {
  const { hasAllRoles, hasAnyRole, loading } = useAuth();

  return {
    hasRoles: requireAll ? hasAllRoles(roles) : hasAnyRole(roles),
    loading,
  };
}
