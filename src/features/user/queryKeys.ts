export const queryKeys = {
    user: (id: string) => ['user', id] as const,
    users: (orgId: string) => ['user', orgId] as const,
}