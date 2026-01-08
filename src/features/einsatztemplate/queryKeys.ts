export const queryKeys = {
  template: (id: string) => ['template', id] as const,
  templates: (orgs: string[]) => ['template', 'list', orgs] as const,
};
