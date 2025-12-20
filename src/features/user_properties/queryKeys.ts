export const userPropertyQueryKeys = {
  all: ["userProperties"] as const,
  byOrg: (orgId: string) =>
    [...userPropertyQueryKeys.all, "org", orgId] as const,
  names: (orgId: string) =>
    [...userPropertyQueryKeys.all, "names", orgId] as const,
  userCount: (orgId: string) =>
    [...userPropertyQueryKeys.all, "userCount", orgId] as const,
};
