export const queryKeys = {
  template: (id: string) => ['template', id] as const,
  templates: (orgs: string[]) => ['template', 'list', orgs] as const,
  /* only used for invalidation of all templates */
  all: ['template'] as const,
};
