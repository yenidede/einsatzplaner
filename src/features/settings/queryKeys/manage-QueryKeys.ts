export const organizationManageQueryKeys = {
  all: ["organizationManage"] as const,

  userSettings: (userId: string) =>
    [...organizationManageQueryKeys.all, "userSettings", userId] as const,

  organization: (orgId: string) =>
    [...organizationManageQueryKeys.all, "organization", orgId] as const,

  userOrganizations: (orgId: string) =>
    [...organizationManageQueryKeys.all, "userOrganizations", orgId] as const,
} as const;
