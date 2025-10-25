export const settingsQueryKeys = {
  all: ['settings'] as const,
  
  userSettings: (userId: string) => 
    [...settingsQueryKeys.all, 'userSettings', userId] as const,
  
  appConfigurations: () => 
    [...settingsQueryKeys.all, 'appConfigurations'] as const,
  
  organizationSettings: (userId: string, orgId: string) =>
    [...settingsQueryKeys.all, 'organizationSettings', userId, orgId] as const,
  
  userOrganizations: (userId: string) =>
    [...settingsQueryKeys.all, 'userOrganizations', userId] as const,
  
  profilePicture: (userId: string) =>
    [...settingsQueryKeys.all, 'profilePicture', userId] as const,
} as const;