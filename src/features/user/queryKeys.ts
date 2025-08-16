export const queryKeys = {
    user: (id: string) => ['user', id] as const,
    users: (orgIds: string | string[]) => ['user', Array.isArray(orgIds) ? orgIds : [orgIds]] as const,
}