// Neue Datei: src/types/auth.ts
export interface User {
  id: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  picture_url: string | null;
}

export interface Organization {
  id: string;
  name: string;
  helper_name_singular?: string | null;
  helper_name_plural?: string | null;
  einsatz_name_singular?: string | null;
  einsatz_name_plural?: string | null;
}

export interface OrganizationUser {
  organizationId: string;
  organization: Organization;
  role: RoleName;
  roleId: string;
  roleAbbreviation?: string | null;
  permissions: string[];
}

export interface AuthUser extends User {
  // Current active context
  currentOrgId: string | null;
  currentRole: RoleName | null;
  currentOrganization: Organization | null;
  
  // All user organizations
  organizations: OrganizationUser[];
  
  // Aggregate data across all organizations
  allRoles: RoleName[]; // All unique roles
  allRoleIds: string[]; // All role IDs
  allPermissions: string[]; // All unique permissions
}

export type RoleName = 'Helfer' | 'Einsatzverwaltung' | 'Organisationsverwaltung' | 'Superadmin';

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthActions {
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refetch: () => Promise<void>;
}

export interface AuthPermissions {
  // Current organization
  can: (permission: string, orgId?: string) => boolean;
  hasRole: (role: RoleName, orgId?: string) => boolean;
  isAdmin: (orgId?: string) => boolean;
  getCurrentPermissions: () => string[];
  
  // Multi-organization
  hasRoleAnywhere: (role: RoleName) => boolean;
  canAnywhere: (permission: string) => boolean;
  isAdminAnywhere: () => boolean;
  getAllPermissions: () => string[];
  getOrganizationsByRole: (role: RoleName) => OrganizationUser[];
}