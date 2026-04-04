export const notificationPreferenceQueryKeys = {
  all: ['notification-preferences'] as const,
  user: {
    cards: (userId: string) =>
      [...notificationPreferenceQueryKeys.all, 'user', userId, 'cards'] as const,
  },
  org: {
    defaults: (organizationId: string) =>
      [
        ...notificationPreferenceQueryKeys.all,
        'org',
        organizationId,
        'defaults',
      ] as const,
  },
};
