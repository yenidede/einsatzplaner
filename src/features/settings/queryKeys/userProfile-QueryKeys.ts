export const userProfileQueryKeys = {
  all: ["userProfile"] as const,

  profile: (userId: string, organizationId: string) =>
    [...userProfileQueryKeys.all, userId, organizationId] as const,

  orgRoles: (userId: string, organizationId: string) =>
    [...userProfileQueryKeys.all, "orgRoles", userId, organizationId] as const,

  allOrgRoles: (organizationId: string) =>
    [...userProfileQueryKeys.all, "allOrgRoles", organizationId] as const,
} as const;

export const organizationUsersQueryKeys = {
  all: ["organizationUsers"] as const,

  byOrg: (organizationId: string) =>
    [...organizationUsersQueryKeys.all, organizationId] as const,
} as const;
