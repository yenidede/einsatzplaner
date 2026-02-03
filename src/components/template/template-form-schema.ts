import { z } from 'zod';

/** Base schema for template metadata. Extend this when adding validation for custom fields etc. */
export const templateFormBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Template Bezeichnung ist erforderlich')
    .transform((s) => s.trim()),
  icon_id: z.string().min(1, 'Bitte wählen Sie ein Icon aus'),
  description: z
    .string()
    .default('')
    .transform((s) => (s.trim() === '' ? null : s)),
});

export type TemplateFormBaseValues = z.infer<typeof templateFormBaseSchema>;

/**
 * Full template form schema. Extend with .extend({ fields: z.array(...) }) when
 * validating custom template fields.
 */
export const templateFormSchema = templateFormBaseSchema;

/** Parsed/submit values (after transforms). */
export type TemplateFormValues = z.infer<typeof templateFormSchema>;

/** Form field values (for useForm defaultValues / watch). */
export type TemplateFormInputValues = z.input<typeof templateFormSchema>;
