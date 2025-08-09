export const queryKeys = {
    einsaetze: (orgs: string[]) => ['einsaetze', orgs] as const,
    einsatz: (id: string) => ['einsatz', id] as const,
};