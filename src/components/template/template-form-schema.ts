import { z } from 'zod';

/** Base schema for template metadata. Extend this when adding validation for custom fields etc. */
export const templateFormBaseSchema = z.object({
  name: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Template Bezeichnung ist erforderlich')
  ),
  icon_id: z.string().min(1, 'Bitte wählen Sie ein Icon aus'),
  description: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string') {
        const t = val.trim();
        return t === '' ? null : t;
      }
      return val;
    },
    z.union([z.string(), z.null()])
  ),
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
