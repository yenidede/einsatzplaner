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
  email: z
    .string()
    .trim()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
});

export type OrganizationStepValues = z.infer<typeof organizationStepSchema>;

export const newAccountStepSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
    vorname: z
      .string()
      .trim()
      .min(2, 'Bitte geben Sie einen Vornamen mit mindestens 2 Zeichen ein.')
      .max(100, 'Der Vorname darf maximal 100 Zeichen lang sein.'),
    nachname: z
      .string()
      .trim()
      .min(2, 'Bitte geben Sie einen Nachnamen mit mindestens 2 Zeichen ein.')
      .max(100, 'Der Nachname darf maximal 100 Zeichen lang sein.'),
    passwort: z
      .string()
      .min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.')
      .max(128, 'Das Passwort darf maximal 128 Zeichen lang sein.'),
    passwort2: z.string(),
  })
  .refine((values) => values.passwort === values.passwort2, {
    path: ['passwort2'],
    message: 'Die Passwörter stimmen nicht überein.',
  });

export type NewAccountStepValues = z.infer<typeof newAccountStepSchema>;

export const existingAccountStepSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
  passwort: z
    .string()
    .min(1, 'Bitte geben Sie Ihr Passwort ein.')
    .max(128, 'Das Passwort darf maximal 128 Zeichen lang sein.'),
});

export type ExistingAccountStepValues = z.infer<typeof existingAccountStepSchema>;
