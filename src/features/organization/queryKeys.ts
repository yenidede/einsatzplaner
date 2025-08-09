export const queryKeys = {
    organizations: (orgs: string[]) => ['einsaetze', orgs] as const,
    organization: (id: string) => ['einsatz', id] as const,
};