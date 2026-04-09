import { z } from 'zod';
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

const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
];
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_ERROR_MESSAGE =
  'Bitte geben Sie eine gültige E-Mail-Adresse ein';
const PHONE_ERROR_MESSAGE =
  'Bitte geben Sie eine gültige Telefonnummer im Format +436601234567 ein';
const PASSWORD_LENGTH_ERROR_MESSAGE =
  'Das Passwort muss mindestens 8 Zeichen lang sein.';
const emailSchema = z.email(EMAIL_ERROR_MESSAGE);

export type SelfSignupAccountMode = 'new' | 'existing' | 'logged_in';

type RequiredUserFieldPath =
  | 'user-vorname'
  | 'user-nachname'
  | 'user-email'
  | 'user-password'
  | 'user-passwort-confirm';

type RequiredUserField = {
  path: RequiredUserFieldPath;
  label: string;
};

const requiredUserFieldsByMode: Record<
  Exclude<SelfSignupAccountMode, 'logged_in'>,
  readonly RequiredUserField[]
> = {
  new: [
    { path: 'user-vorname', label: 'Der Vorname' },
    { path: 'user-nachname', label: 'Der Nachname' },
    { path: 'user-email', label: 'Die E-Mail-Adresse' },
    { path: 'user-password', label: 'Das Passwort' },
    { path: 'user-passwort-confirm', label: 'Die Passwortbestätigung' },
  ],
  existing: [
    { path: 'user-email', label: 'Die E-Mail-Adresse' },
    { path: 'user-password', label: 'Das Passwort' },
  ],
};

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} ist erforderlich`);

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || emailSchema.safeParse(value).success,
    EMAIL_ERROR_MESSAGE
  );

const fileListSchema = z.custom<FileList>(
  (value) => typeof FileList !== 'undefined' && value instanceof FileList,
  'Bitte wählen Sie eine Datei aus'
);

const singleUploadSchema = z
  .union([
    z.file().mime(IMAGE_MIME_TYPES).max(MAX_UPLOAD_SIZE_BYTES),
    z.string().min(1, 'Bitte wählen Sie eine Datei aus'),
    fileListSchema,
  ])
  .optional();

const optionalPhoneNumber = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || isValidPhoneNumber(value), PHONE_ERROR_MESSAGE)
  .transform((value) => {
    if (!value) {
      return value;
    }

    return parsePhoneNumberWithError(value).format('E.164');
  });

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
  'user-email': optionalEmailSchema,
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

function addRequiredFieldIssue(
  value: string | undefined,
  field: RequiredUserField,
  ctx: z.RefinementCtx
) {
  if (value?.trim()) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [field.path],
    message: `${field.label} ist erforderlich`,
  });
}

function addPasswordLengthIssue(
  value: string | undefined,
  path: 'user-password' | 'user-passwort-confirm',
  ctx: z.RefinementCtx
) {
  if (!value || value.length >= PASSWORD_MIN_LENGTH) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message: PASSWORD_LENGTH_ERROR_MESSAGE,
  });
}

function addModeSpecificIssues(
  data: z.input<typeof selfSignupBaseSchema>,
  accountMode: SelfSignupAccountMode,
  ctx: z.RefinementCtx
) {
  if (accountMode === 'logged_in') {
    return;
  }

  for (const field of requiredUserFieldsByMode[accountMode]) {
    addRequiredFieldIssue(data[field.path], field, ctx);
  }

  addPasswordLengthIssue(data['user-password'], 'user-password', ctx);

  if (accountMode !== 'new') {
    return;
  }

  addPasswordLengthIssue(
    data['user-passwort-confirm'],
    'user-passwort-confirm',
    ctx
  );

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
}

export function createFormSchema(accountMode: SelfSignupAccountMode) {
  return selfSignupBaseSchema.superRefine((data, ctx) => {
    addModeSpecificIssues(data, accountMode, ctx);
  });
}

export const formSchema = createFormSchema('new');

export type SelfSignupFormValues = z.input<typeof selfSignupBaseSchema>;
