import { EinsatzCustomizable } from "./types";

export const queryKeys = {
    einsaetze: (orgs: string[]) => ['einsatz', "list", orgs] as const,
    allEinsaetze: () => ['einsatz', "list"] as const,
    einsaetzeTableView: (orgs: string[]) => ['einsatz', "list", "table", orgs] as const,
    einsaetzeFiltered: (filters: Partial<EinsatzCustomizable>, sort: { id: string; order: string }, page: number, perPage: number) => ['einsatz', "list", "filtered", filters, sort, page, perPage] as const,
    detailedEinsatz: (id: string) => ['einsatz', "detail", id] as const,
    einsatzComments: (id: string) => ['einsatz', "detail", id, "comments"] as const,
    einsatzHelpers: (id: string) => ['einsatz', "detail", id, "helpers"] as const,
    categories: (activeOrgId: string) => ["categories", activeOrgId] as const,
};