'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { AuthUser, AuthState, AuthActions, AuthPermissions, RoleName } from '@/types/auth';
import { PERMISSIONS, PermissionKey, roleHasPermission, isAdminRole } from '@/config/permissions';

/**
 * Fetch current user data from API
 */
async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
}

/**
 * Main authentication hook
 * Provides user state, permissions, and actions
 */
export function useAuth(): AuthState & AuthActions & AuthPermissions {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Current organization context
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  // User data query
  const userQuery = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: fetchCurrentUser,
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  const user: AuthUser | null = userQuery.data ?? null;
  const isLoading = status === 'loading' || userQuery.isLoading;
  const isAuthenticated = !!session && !!user;

  // Set default organization on first load
  useEffect(() => {
    if (user && !currentOrgId && user.organizations.length > 0) {
      setCurrentOrgId(user.currentOrgId || user.organizations[0].organizationId);
    }
  }, [user, currentOrgId]);

  // Current organization context
  const currentOrganization = useMemo(() => {
    if (!user || !currentOrgId) return null;
    return user.organizations.find(o => o.organizationId === currentOrgId) || null;
  }, [user, currentOrgId]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await signOut({ 
          callbackUrl: '/signin', 
          redirect: false 
        });
        queryClient.clear();
      } catch (error) {
        console.error('Logout error:', error);
        queryClient.clear();
      }
    },
    onSuccess: () => {
      router.push('/signin');
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      router.push('/signin');
    }
  });

  // Actions
  const logout = useCallback(() => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);
  
  const switchOrganization = useCallback((orgId: string) => {
    const organizationUser = user?.organizations.find(o => o.organizationId === orgId);
    if (organizationUser) {
      setCurrentOrgId(orgId);
    }
  }, [user?.organizations]);

  const refetch = useCallback(async () => {
    try {
      await userQuery.refetch();
    } catch (error) {
      console.error('Error refetching user:', error);
    }
  }, [userQuery]);

  // Permission checker
  const can = useCallback((permission: string, orgId?: string): boolean => {
    if (!user) return false;
    
    const targetOrgId = orgId || currentOrgId;
    if (!targetOrgId) return false;

    const organizationUser = user.organizations.find(o => o.organizationId === targetOrgId);
    if (!organizationUser) return false;

    // Superadmin can do everything
    if (organizationUser.role === 'Superadmin') return true;

    return roleHasPermission(organizationUser.role, permission as PermissionKey);
  }, [user, currentOrgId]);

  // Role checker
  const hasRole = useCallback((role: RoleName, orgId?: string): boolean => {
    if (!user) return false;
    
    const targetOrgId = orgId || currentOrgId;
    if (!targetOrgId) return false;

    const organizationUser = user.organizations.find(o => o.organizationId === targetOrgId);
    return organizationUser?.role === role;
  }, [user, currentOrgId]);

  // Admin checker
  const isAdmin = useCallback((orgId?: string): boolean => {
    if (!user) return false;
    
    const targetOrgId = orgId || currentOrgId;
    if (!targetOrgId) return false;

    const organizationUser = user.organizations.find(o => o.organizationId === targetOrgId);
    return organizationUser ? isAdminRole(organizationUser.role) : false;
  }, [user, currentOrgId]);

  // Role checker - ANY organization
  const hasRoleAnywhere = useCallback((role: RoleName): boolean => {
    if (!user) return false;
    return user.allRoles.includes(role);
  }, [user]);

  // Permission checker - ANY organization  
  const canAnywhere = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.allPermissions.includes(permission);
  }, [user]);

  // Admin checker - ANY organization
  const isAdminAnywhere = useCallback((): boolean => {
    if (!user) return false;
    return user.allRoles?.some(role => isAdminRole(role)) || false;
  }, [user]);

  // Get ALL permissions across organizations
  const getAllPermissions = useCallback((): string[] => {
    return user?.allPermissions || [];
  }, [user]);

  // Get organizations where user has specific role
  const getOrganizationsByRole = useCallback((role: RoleName) => {
    if (!user) return [];
    return user.organizations.filter(org => org.role === role);
  }, [user]);

  // Get current permissions for current organization
  const getCurrentPermissions = useCallback((): string[] => {
    if (!currentOrganization) return [];
    return currentOrganization.permissions || [];
  }, [currentOrganization]);

  return {
    // State
    user,
    isLoading,
    isAuthenticated,
    
    // Actions
    logout,
    switchOrganization,
    refetch,
    
    // Permissions (current org)
    can,
    hasRole,
    isAdmin,
    getCurrentPermissions,
    
    // Multi-organization permissions
    hasRoleAnywhere,
    canAnywhere,
    isAdminAnywhere,
    getAllPermissions,
    getOrganizationsByRole,
  };
}

// Legacy exports for backward compatibility
export function useAuthUser() {
  const { user, isLoading, isAuthenticated } = useAuth();
  return { user, isLoading, isAuthenticated };
}

export function usePermissions() {
  const { can, getCurrentPermissions, user } = useAuth();
  return { 
    hasPermission: can,
    permissions: getCurrentPermissions(),
    userRole: user?.currentRole,
    can,
  };
}
