export const analyticsQueryKeys = {
  all: ['analytics'] as const,
  byOrg: (orgId: string) => [...analyticsQueryKeys.all, 'org', orgId] as const,
};
