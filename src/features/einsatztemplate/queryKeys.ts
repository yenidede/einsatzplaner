export const queryKeys = {
  template: (id: string) => ['template', id] as const,
  templateWithReuseGraph: (id: string) =>
    [...queryKeys.template(id), 'with-reuse-graph'] as const,
  templates: (orgs: string[]) => ['template', 'list', orgs] as const,
  fieldReuseCandidates: (orgId: string, excludeTemplateId?: string | null) =>
    [
      'template',
      'field-reuse-candidates',
      orgId,
      excludeTemplateId ?? '',
    ] as const,
  /**  only used for invalidation of all templates */
  all: ['template'] as const,
  icons: ['template', 'icons'] as const,
};
