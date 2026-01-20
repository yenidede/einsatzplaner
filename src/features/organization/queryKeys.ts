export const queryKeys = {
  all: ['organization'] as const,
  organizations: (orgs: string[]) => ['organization', orgs] as const,
  organization: (id: string) => ['organization', id] as const,
};
