import { z } from 'zod';

export const organizationStepSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, 'Bitte geben Sie einen Organisationsnamen mit mindestens 2 Zeichen ein.')
    .max(120, 'Der Organisationsname darf maximal 120 Zeichen lang sein.'),
  organizationDescription: z
    .string()
    .trim()
    .max(600, 'Die Beschreibung darf maximal 600 Zeichen lang sein.')
    .optional()
    .transform((value) => value ?? ''),
});

export type OrganizationStepValues = z.infer<typeof organizationStepSchema>;
