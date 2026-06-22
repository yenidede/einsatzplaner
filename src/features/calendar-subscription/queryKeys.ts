export const calendarSubscriptionQueryKeys = {
  all: ['calendar-subscription'] as const,
  exports: (userId?: string) =>
    [...calendarSubscriptionQueryKeys.all, 'exports', userId ?? ''] as const,
  exportsByOrg: (userId?: string, orgId?: string) =>
    [
      ...calendarSubscriptionQueryKeys.exports(userId),
      'org',
      orgId ?? '',
    ] as const,
  templates: (orgId?: string) =>
    [...calendarSubscriptionQueryKeys.all, 'templates', orgId ?? ''] as const,
  preview: (userId?: string, orgId?: string) =>
    [
      ...calendarSubscriptionQueryKeys.all,
      'preview',
      userId ?? '',
      orgId ?? '',
    ] as const,
};
