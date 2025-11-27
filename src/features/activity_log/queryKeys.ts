export const queryKeys = {
    all: ["activities"] as const,
    list: (params: { limit: number; offset: number }) =>
        [...queryKeys.all, "list", params] as const,
};