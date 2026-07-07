export const documentTemplateQueryKeys = {
  all: ['document-templates'] as const,
  byOrganization: (organizationId: string) =>
    [...documentTemplateQueryKeys.all, 'organization', organizationId] as const,
  detail: (templateId: string) =>
    [...documentTemplateQueryKeys.all, 'detail', templateId] as const,
  fields: (organizationId: string) =>
    [...documentTemplateQueryKeys.all, 'fields', organizationId] as const,
};
