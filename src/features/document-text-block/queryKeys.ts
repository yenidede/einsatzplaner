export const documentTextBlockQueryKeys = {
  all: ['document-text-blocks'] as const,
  byOrganization: (organizationId: string) =>
    [...documentTextBlockQueryKeys.all, 'organization', organizationId] as const,
};
