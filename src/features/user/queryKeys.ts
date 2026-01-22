export const queryKeys = {
  user: (id: string) => ['user', id] as const,
  users: (orgIds: string | string[] | null | undefined) =>
    ['user', orgIds == null ? 'all' : Array.isArray(orgIds) ? orgIds : [orgIds]] as const,
};
