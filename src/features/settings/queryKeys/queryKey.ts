export const settingsQueryKeys = {
  all: ['settings'] as const,

  userSettings: (userId: string) =>
    [...settingsQueryKeys.all, 'userSettings', userId] as const,

  appConfigurations: () =>
    [...settingsQueryKeys.all, 'appConfigurations'] as const,

  organization: (orgId: string) =>
    [...settingsQueryKeys.all, 'organization', orgId] as const,

  organizationSettings: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, 'organizationSettings', userId, orgId] as const,

  profilePicture: (userId: string) =>
    [...settingsQueryKeys.all, 'profilePicture', userId] as const,

  userOrgRoles: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, 'userOrgRoles', userId, orgId] as const,

  userProfile: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, 'userProfile', userId, orgId] as const,

  allOrgRoles: (orgId: string) =>
    [...settingsQueryKeys.all, 'org', orgId, 'roles', 'all'] as const,

  organizationUsers: (orgId: string) =>
    [...settingsQueryKeys.all, 'org', orgId, 'users'] as const,

  userOrganizations: (orgId: string) =>
    [...settingsQueryKeys.all, 'org', orgId, 'userOrganizations'] as const,

  mailNotifications: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, 'mailNotifications', userId, orgId] as const,

  calendarSubscription: (orgId: string, userId: string) =>
    [...settingsQueryKeys.all, 'calendar', orgId, userId] as const,

  salutation: () => [...settingsQueryKeys.all, 'salutations'] as const,

  orgDetails: (orgId: string) =>
    [...settingsQueryKeys.all, 'orgDetails', orgId] as const,

  userPropertyValues: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, 'userPropertyValues', userId, orgId] as const,
} as const;

export type SettingsQueryKeys = typeof settingsQueryKeys;
