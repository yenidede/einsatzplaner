'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Types für Auth Context
export interface AuthUser {
  id: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  picture_url: string | null;
  role: string;
  orgId: string;
  organization: {
    id: string;
    name: string;
    helper_name_singular?: string;
    helper_name_plural?: string;
    einsatz_name_singular?: string;
    einsatz_name_plural?: string;
  };
}

export interface AuthContext {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  isInOrganization: (orgId: string) => boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

// API Funktionen
async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error('Failed to fetch user data');
  }

  return response.json();
}

// Permission System
const PERMISSIONS = {
  'Helfer': [
    'read:einsaetze',
    'join:einsaetze',
    'read:profile',
    'update:profile'
  ],
  'Einsatzverwaltung': [
    'read:einsaetze',
    'create:einsaetze',
    'update:einsaetze',
    'delete:einsaetze',
    'manage:helpers',
    'invite:users',
    'read:templates',
    'create:templates',
    'update:templates',
    'delete:templates'
  ],
  'Organisationsverwaltung': [
    'read:einsaetze',
    'create:einsaetze',
    'update:einsaetze',
    'delete:einsaetze',
    'manage:helpers',
    'invite:users',
    'manage:users',
    'manage:organization',
    'read:templates',
    'create:templates',
    'update:templates',
    'delete:templates',
    'manage:roles'
  ]
} as const;

// Main Auth Hook
export function useAuth(): AuthContext {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Query für User-Daten
  const {
    data: user,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['auth', 'user', session?.user?.id],
    queryFn: fetchCurrentUser,
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 Minuten
    retry: false,
  });

  const isLoading = status === 'loading' || isUserLoading;
  const isAuthenticated = !!session && !!user;

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut({ 
        callbackUrl: '/signin',
        redirect: false 
      });
      queryClient.clear();
    },
    onSuccess: () => {
      router.push('/signin');
    },
  });

  // Permission Checker
  const hasPermission = (permission: string): boolean => {
    if (!user?.role) return false;
    const userPermissions = PERMISSIONS[user.role as keyof typeof PERMISSIONS] || [];
    return [...userPermissions].includes(permission);
  };

  // Role Checker
  const hasRole = (role: string | string[]): boolean => {
    if (!user?.role) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  // Organization Checker
  const isInOrganization = (orgId: string): boolean => {
    return user?.orgId === orgId;
  };

  return {
    user: user || null,
    isLoading,
    isAuthenticated,
    hasPermission,
    hasRole,
    isInOrganization,
    logout: () => logoutMutation.mutateAsync(),
    refetchUser: async () => { await refetchUser(); },
  };
}

// Hook für Auth Guards
export function useAuthGuard(options?: {
  requireAuth?: boolean;
  requiredRole?: string | string[];
  requiredPermission?: string;
  requiredOrganization?: string;
  redirectTo?: string;
}) {
  const auth = useAuth();
  const router = useRouter();

  const {
    requireAuth = true,
    requiredRole,
    requiredPermission,
    requiredOrganization,
    redirectTo = '/signin',
  } = options || {};

  // Warte auf Auth-Status
  if (auth.isLoading) {
    return { ...auth, isAuthorized: false, isChecking: true };
  }

  // Auth erforderlich, aber nicht eingeloggt
  if (requireAuth && !auth.isAuthenticated) {
    router.push(redirectTo);
    return { ...auth, isAuthorized: false, isChecking: false };
  }

  // Rolle prüfen
  if (requiredRole && !auth.hasRole(requiredRole)) {
    router.push('/unauthorized');
    return { ...auth, isAuthorized: false, isChecking: false };
  }

  // Berechtigung prüfen
  if (requiredPermission && !auth.hasPermission(requiredPermission)) {
    router.push('/unauthorized');
    return { ...auth, isAuthorized: false, isChecking: false };
  }

  // Organisation prüfen
  if (requiredOrganization && !auth.isInOrganization(requiredOrganization)) {
    router.push('/unauthorized');
    return { ...auth, isAuthorized: false, isChecking: false };
  }

  return { ...auth, isAuthorized: true, isChecking: false };
}

// Helper Hooks
export function useAuthUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export function usePermissions() {
  const { hasPermission, user } = useAuth();
  return { hasPermission, userRole: user?.role };
}

export function useAuthOrganization() {
  const { user, isInOrganization } = useAuth();
  return {
    organization: user?.organization,
    orgId: user?.orgId,
    isInOrganization,
  };
}
