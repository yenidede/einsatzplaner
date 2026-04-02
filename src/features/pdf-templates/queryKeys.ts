export const pdfTemplateQueryKeys = {
  all: ['pdf-templates'] as const,
  previewInput: (einsatzId: string | null) =>
    [...pdfTemplateQueryKeys.all, 'preview-input', einsatzId ?? 'mock:sentinel'] as const,
};
