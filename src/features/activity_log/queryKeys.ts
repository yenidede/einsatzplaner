export const queryKeys = {
  list: (params: { limit: number; offset: number }) =>
    ["activities", "list", params] as const,
};