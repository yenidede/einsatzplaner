export const settingsQueryKeys = {
  all: ["settings"] as const,

  userSettings: (userId: string) =>
    [...settingsQueryKeys.all, "userSettings", userId] as const,

  appConfigurations: () =>
    [...settingsQueryKeys.all, "appConfigurations"] as const,

  organizationSettings: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, "organizationSettings", userId, orgId] as const,

  userOrganizations: (userId: string) =>
    [...settingsQueryKeys.all, "userOrganizations", userId] as const,

  profilePicture: (userId: string) =>
    [...settingsQueryKeys.all, "profilePicture", userId] as const,

  organization: (orgId: string) =>
    [...settingsQueryKeys.all, "organization", orgId] as const,

  userOrgRoles: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, "userOrgRoles", userId, orgId] as const,

  userProfile: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, "userProfile", userId, orgId] as const,

<<<<<<< HEAD
    organizations: (orgs: string[]) =>
    ['organizations', orgs] as const,
=======
  organizations: (orgs: string[]) => ["organizations", orgs] as const,
>>>>>>> 9474a752369a1004da1a8b1ef628347cb4f58da7

  organizationById: (id: string) => ["organization", id] as const,

  organizationUsers: (orgId: string) =>
    [...settingsQueryKeys.all, "organizationUsers", orgId] as const,

  mailNotifications: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, "mailNotifications", userId, orgId] as const,

  calendarSubscription: (orgId: string, userId: string) =>
    [...settingsQueryKeys.all, "calendar", orgId, userId] as const,

  salutation: () => [...settingsQueryKeys.all, "salutations"] as const,
} as const;

export type SettingsQueryKeys = typeof settingsQueryKeys;
