import * as z from 'zod';
import {
  isValidPhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js';

export interface ActionResponse<T = any> {
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

export const formSchema = z
  .object({
    'orga-name': requiredText('Der Organisationsname'),
    'orga-kuerzel': z.string().trim().max(5, 'Maximal 5 Zeichen').optional(),
    'orga-phone': optionalPhoneNumber,
    'orga-website': z
      .string()
      .trim()
      .url('Bitte geben Sie eine gültige Website-URL ein')
      .or(z.literal(''))
      .optional(),
    'user-vorname': requiredText('Der Vorname'),
    'user-nachname': requiredText('Der Nachname'),
    'user-email': requiredText('Die E-Mail-Adresse').email(
      'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    ),
    'user-password': requiredText('Das Passwort').min(
      8,
      'Das Passwort muss mindestens 8 Zeichen lang sein.'
    ),
    'user-passwort-confirm': requiredText('Die Passwortbestätigung').min(
      8,
      'Das Passwort muss mindestens 8 Zeichen lang sein.'
    ),
    'privacy-consent': z.boolean().refine((value) => value, {
      message:
        'Bitte stimmen Sie der Datenschutzerklärung zu, um fortzufahren.',
    }),
    'otp-e72': requiredText('Der Einmalcode').regex(/^\d{6}$/, {
      message: 'Bitte geben Sie einen gültigen 6-stelligen Code ein.',
    }),
    'orga-logo-gross': singleUploadSchema,
    'orga-logo-klein': singleUploadSchema,
    'orga-helfer-singular': z.string().optional(),
    'orga-helfer-plural': z.string().optional(),
    'orga-einsatz-singular': z.string().optional(),
    'orga-einsatz-plural': z.string().optional(),
    'user-profilbild': singleUploadSchema,
  })
  .refine((data) => data['user-password'] === data['user-passwort-confirm'], {
    path: ['user-passwort-confirm'],
    message: 'Die Passwörter stimmen nicht überein.',
  });
