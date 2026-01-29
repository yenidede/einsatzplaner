export const queryKeys = {
  all: ['organization'] as const,
  /** Get a single organization by id. Tries to get from the broader organizations query. */
  organization: (id: string) => ['organization', id] as const,
  /** Get multiple organizations by ids */
  organizations: (orgs: string[]) => ['organization', orgs] as const,
};
