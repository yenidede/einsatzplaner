export const settingsQueryKeys = {
  /** Base key for all settings-related queries - useful for invalidating everything */
  all: ['settings'] as const,

  // User-related queries (primary entity: user)
  user: {
    /** Invalidate all queries for a specific user */
    all: (userId: string) =>
      [...settingsQueryKeys.all, 'user', userId] as const,

    /** User profile data (separate from settings) */
    profile: (userId: string) =>
      [...settingsQueryKeys.all, 'user', userId, 'profile'] as const,

    /** User settings/preferences data - used in settings page and mutations */
    settings: (userId: string | undefined) =>
      [...settingsQueryKeys.all, 'user', userId, 'settings'] as const,
  },

  // Organization-related queries (primary entity: organization)
  org: {
    /** Invalidate all queries for a specific organization */
    all: (orgId: string | undefined) =>
      [...settingsQueryKeys.all, 'org', orgId] as const,

    /** Organization base data (name, description, logo) - from organizations table */
    detail: (orgId: string | undefined) =>
      [...settingsQueryKeys.all, 'org', orgId, 'detail'] as const,

    /** Organization extended details (website, vat, zvr, authority) - from organization_details table */
    details: (orgId: string | undefined) =>
      [...settingsQueryKeys.all, 'org', orgId, 'details'] as const,

    /** All role definitions available in an organization */
    roles: (orgId: string) =>
      [...settingsQueryKeys.all, 'org', orgId, 'roles'] as const,

    /** All users (members) within an organization */
    users: (orgId: string) =>
      [...settingsQueryKeys.all, 'org', orgId, 'users'] as const,

    /** Specific user's assigned roles within an organization */
    userRoles: (orgId: string, userId: string) =>
      [
        ...settingsQueryKeys.all,
        'org',
        orgId,
        'user',
        userId,
        'roles',
      ] as const,

    /** Specific user's profile data within organization context */
    userProfile: (orgId: string, userId: string) =>
      [
        ...settingsQueryKeys.all,
        'org',
        orgId,
        'user',
        userId,
        'profile',
      ] as const,

    /** Specific user's custom property values within an organization */
    userProperties: (orgId: string, userId: string) =>
      [
        ...settingsQueryKeys.all,
        'org',
        orgId,
        'user',
        userId,
        'properties',
      ] as const,
  },

  /** Global salutation options (Herr, Frau, etc.) - static reference data */
  salutation: () => [...settingsQueryKeys.all, 'salutations'] as const,

  /** Organizations where user has OV/management role */
  managedOrganizations: (userId: string) =>
    [
      ...settingsQueryKeys.all,
      'user',
      userId,
      'managed-organizations',
    ] as const,

  /** Calendar subscription data for a specific user */
  calendarSubscription: (userId?: string, orgId?: string) =>
    ['user', 'calendar-subscription', userId ?? '', orgId ?? ''] as const,
};

export type SettingsQueryKeys = typeof settingsQueryKeys;
