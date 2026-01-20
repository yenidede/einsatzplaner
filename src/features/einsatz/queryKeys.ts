export const queryKeys = {
  allLists: () => ['einsaetze', 'list'] as const, // used to invalidate all List
  einsaetze: (orgId: string) => ['einsatz', 'list', orgId] as const,
  einsaetzeTableView: (orgIds: string[]) =>
    ['einsatz', 'list', orgIds, 'table'] as const,
  detailedEinsatz: (id: string) => ['einsatz', id, 'detail'] as const,
  einsatzHelpers: (id: string) => ['einsatz', id, 'detail', 'helpers'] as const,
  categories: (activeOrgId: string) => ['categories', activeOrgId] as const,
};
