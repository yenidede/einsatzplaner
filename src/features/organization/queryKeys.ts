export const queryKeys = {
  all: ['organization'] as const,
  organizations: (orgs: string[]) => ['organization', orgs] as const,
  organization: (id: string) => ['organization', id] as const,
  addresses: (organizationId: string) =>
    ['organization', 'addresses', organizationId] as const,
  bankAccounts: (organizationId: string) =>
    ['organization', 'bank-accounts', organizationId] as const,
};
