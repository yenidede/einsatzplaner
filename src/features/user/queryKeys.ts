export const queryKeys = {
  users: (orgIds: string | string[] | null | undefined) =>
    ['user', orgIds == null ? '' : Array.isArray(orgIds) ? orgIds : [orgIds]] as const,
};
