export const queryKeys = {
  user: (id: string) => ['user', id] as const,
  users: (orgIds: string | string[] | null | undefined) =>
    ['user', Array.isArray(orgIds) ? orgIds : [orgIds ?? '']] as const,
};
