import { EinsatzCustomizableFilter } from "./types";

export const queryKeys = {
    einsaetze: (orgs: string[]) => ['einsatz', "list", orgs] as const,
    allEinsaetze: () => ['einsatz', "list"] as const,
    einsaetzeFiltered: (filters: Partial<EinsatzCustomizableFilter>) => ['einsatz', "list", "filtered", filters] as const,
    detailedEinsatz: (id: string) => ['einsatz', "detail", id] as const,
    einsatzComments: (id: string) => ['einsatz', "detail", id, "comments"] as const,
    einsatzHelpers: (id: string) => ['einsatz', "detail", id, "helpers"] as const
};