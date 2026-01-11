import { z } from 'zod';

// User roles enum
export const UserRole = {
  HELFER: 'Helfer',
  EINSATZVERWALTUNG: 'Einsatzverwaltung',
  ORGANISATIONSVERWALTUNG: 'Organisationsverwaltung',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Validation schemas for client-side use
export const UserRoleSchema = z.enum([
  UserRole.HELFER,
  UserRole.EINSATZVERWALTUNG,
  UserRole.ORGANISATIONSVERWALTUNG,
]);

export const CreateUserSchema = z.object({
  email: z.email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  firstname: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben'),
  lastname: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben'),
  role: UserRoleSchema.optional(),
  phone: z.string().optional().nullable().or(z.literal('')),
  organizationName: z
    .string()
    .min(2, 'Organisationsname muss mindestens 2 Zeichen haben'),
});

export type CreateUserData = z.infer<typeof CreateUserSchema>;

// User without password for client-side use
export interface UserWithoutPassword {
  _id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  organizationName: string;
  phone?: string | null;
  initials: string; // Assuming you have a way to generate initials
  picture_url?: string | null;
  description?: string | null;
  last_login?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Login data schema
export const LoginSchema = z.object({
  email: z.email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

export type LoginData = z.infer<typeof LoginSchema>;
