export const queryKeys = {
  allLists: () => ['einsaetze', 'list'] as const, // used to invalidate all List
  einsaetze: (orgId: string) => ['einsatz', 'list', orgId] as const,
  einsaetzeTableView: (orgIds: string[]) =>
    ['einsatz', 'list', orgIds, 'table'] as const,
  /** One cache entry per (orgId, monthKey); invalidate only affected months. */
  einsaetzeForCalendar: (orgId: string, monthKey: string) =>
    ['einsatz', 'calendar', orgId, monthKey] as const,
  einsaetzeForCalendarPrefix: (orgId: string) =>
    ['einsatz', 'calendar', orgId] as const,
  detailedEinsatz: (id: string) => ['einsatz', id, 'detail'] as const,
  einsatzHelpers: (id: string) => ['einsatz', id, 'detail', 'helpers'] as const,
  categories: (activeOrgId: string) => ['categories', activeOrgId] as const,
};
