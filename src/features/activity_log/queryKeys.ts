export const queryKeys = {
  list: (params: { limit: number; offset: number }) =>
    ["activities", "list", params] as const,
  einsatz: (einsatzId: string) => ["activities", "einsatz", einsatzId] as const,
};