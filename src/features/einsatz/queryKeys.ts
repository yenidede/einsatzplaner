export const queryKeys = {
  einsaetze: (orgId: string) => ['einsatz', 'list', orgId] as const,
  einsaetzeTableView: (orgs: string[]) =>
    ['einsatz', 'list', 'table', orgs] as const,
  detailedEinsatz: (id: string) => ['einsatz', 'detail', id] as const,
  einsatzHelpers: (id: string) => ['einsatz', 'detail', id, 'helpers'] as const,
  categories: (activeOrgId: string) => ['categories', activeOrgId] as const,
};
