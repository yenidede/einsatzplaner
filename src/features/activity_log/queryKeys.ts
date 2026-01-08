export const activityLogQueryKeys = {
  all: ['activities'] as const,

  list: (params: { limit: number; offset: number }) =>
    ['activities', 'list', params] as const,
  einsatz: (einsatzId: string, limit: number) =>
    ['activities', 'einsatz', einsatzId, limit] as const,
};
