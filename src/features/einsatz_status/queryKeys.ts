export const queryKeys = {
    status: (id: string) => ['status', id] as const,
    statuses: () => ['status', "list"] as const,
};