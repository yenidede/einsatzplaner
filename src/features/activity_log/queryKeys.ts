export const activityLogQueryKeys = {
  all: ['activities'] as const,

  list: (params: { limit: number; offset: number }) =>
    ['activities', 'list', params] as const,
  allEinsatz: (einsatzId: string) =>
    ['activities', 'einsatz', einsatzId] as const, // used to invalidate all activities for einsatz
  einsatz: (einsatzId: string, limit: number) =>
    ['activities', 'einsatz', einsatzId, limit] as const,
};
