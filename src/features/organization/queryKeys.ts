export const queryKeys = {
  organizations: (orgs: string[]) => ['organization', orgs] as const,
  organization: (id: string) => ['organization', id] as const,
};
