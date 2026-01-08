export const pdfQueryKeys = {
  all: ['pdf'] as const,

  generate: (einsatzId: string) =>
    [...pdfQueryKeys.all, 'generate', einsatzId] as const,
} as const;
