export const queryKeys = {
    einsaetze: (orgs: string[]) => ['einsatz', "list", orgs] as const,
    allEinsaetze: () => ['einsatz', "list"] as const,
    detailedEinsatz: (id: string) => ['einsatz', "detail", id] as const,
    einsatzComments: (id: string) => ['einsatz', "detail", id, "comments"] as const,
    einsatzHelpers: (id: string) => ['einsatz', "detail", id, "helpers"] as const
};