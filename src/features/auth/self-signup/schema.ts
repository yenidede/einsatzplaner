import * as z from 'zod';
import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js';

export interface ActionResponse<T = Record<string, unknown>> {
  success: boolean;
  message: string;
  errors?: {
    [K in keyof T]?: string[];
  };
  inputs?: T;
}

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} ist erforderlich`);

const fileListSchema = z.custom<FileList>(
  (value) => typeof FileList !== 'undefined' && value instanceof FileList,
  'Bitte wählen Sie eine Datei aus'
);

const singleUploadSchema = z.union([
  z.file()
    .mime(['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'])
    .max(5242880),
  z.string().min(1, 'Bitte wählen Sie eine Datei aus'),
  fileListSchema,
]).optional();

const optionalPhoneNumber = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || isValidPhoneNumber(value),
    'Bitte geben Sie eine gültige Telefonnummer im Format +436601234567 ein'
  )
  .transform((value) => {
    if (!value) return value;
    return parsePhoneNumberWithError(value).format('E.164');
  });

export type SelfSignupAccountMode = 'new' | 'existing' | 'logged_in';

export const selfSignupBaseSchema = z.object({
  'orga-name': requiredText('Der Organisationsname'),
  'orga-kuerzel': z.string().trim().max(5, 'Maximal 5 Zeichen').optional(),
  'orga-phone': optionalPhoneNumber,
  'orga-website': z
    .string()
    .trim()
    .url('Bitte geben Sie eine gültige Website-URL ein')
    .or(z.literal(''))
    .optional(),
  'user-vorname': z.string().trim().optional(),
  'user-nachname': z.string().trim().optional(),
  'user-email': z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    ),
  'user-password': z.string().optional(),
  'user-passwort-confirm': z.string().optional(),
  'privacy-consent': z.boolean().refine((value) => value, {
    message:
      'Bitte stimmen Sie der Datenschutzerklärung zu, um fortzufahren.',
  }),
  'orga-logo-gross': singleUploadSchema,
  'orga-logo-klein': singleUploadSchema,
  'orga-helfer-singular': z.string().optional(),
  'orga-helfer-plural': z.string().optional(),
  'orga-einsatz-singular': z.string().optional(),
  'orga-einsatz-plural': z.string().optional(),
  'user-profilbild': singleUploadSchema,
});

function requireField(
  value: string | undefined,
  path:
    | 'user-vorname'
    | 'user-nachname'
    | 'user-email'
    | 'user-password'
    | 'user-passwort-confirm',
  label: string,
  ctx: z.RefinementCtx
) {
  if (value?.trim()) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message: `${label} ist erforderlich`,
  });
}

export function createFormSchema(accountMode: SelfSignupAccountMode) {
  return selfSignupBaseSchema.superRefine((data, ctx) => {
    if (accountMode === 'new') {
      requireField(data['user-vorname'], 'user-vorname', 'Der Vorname', ctx);
      requireField(data['user-nachname'], 'user-nachname', 'Der Nachname', ctx);
      requireField(
        data['user-email'],
        'user-email',
        'Die E-Mail-Adresse',
        ctx
      );
      requireField(
        data['user-password'],
        'user-password',
        'Das Passwort',
        ctx
      );
      requireField(
        data['user-passwort-confirm'],
        'user-passwort-confirm',
        'Die Passwortbestätigung',
        ctx
      );

      if (data['user-password'] && data['user-password'].length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['user-password'],
          message: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
        });
      }

      if (
        data['user-passwort-confirm'] &&
        data['user-passwort-confirm'].length < 8
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['user-passwort-confirm'],
          message: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
        });
      }

      if (
        data['user-password'] &&
        data['user-passwort-confirm'] &&
        data['user-password'] !== data['user-passwort-confirm']
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['user-passwort-confirm'],
          message: 'Die Passwörter stimmen nicht überein.',
        });
      }

      return;
    }

    if (accountMode === 'existing') {
      requireField(
        data['user-email'],
        'user-email',
        'Die E-Mail-Adresse',
        ctx
      );
      requireField(
        data['user-password'],
        'user-password',
        'Das Passwort',
        ctx
      );

      if (data['user-password'] && data['user-password'].length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['user-password'],
          message: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
        });
      }
    }
  });
}

export const formSchema = createFormSchema('new');

export type SelfSignupFormValues = z.input<typeof selfSignupBaseSchema>;
