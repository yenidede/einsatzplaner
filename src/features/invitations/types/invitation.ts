import { z } from 'zod';
import { UserRole, UserRoleSchema } from '../../../types/user';

// Invitation status enum
export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired'
} as const;

export type InvitationStatus = typeof InvitationStatus[keyof typeof InvitationStatus];

// Invitation validation schemas
export const InviteUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  firstname: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben'),
  lastname: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben'),
  role: UserRoleSchema,
  organizationName: z.string().min(2, 'Organisationsname muss mindestens 2 Zeichen haben'),
  message: z.string().optional()
});

export type InviteUserData = z.infer<typeof InviteUserSchema>;

export const CreateInvitationSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  organizationId: z.string().uuid('Ungültige Organisations-ID'),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  firstname: z.string().min(1, 'Vorname ist erforderlich'),
  lastname: z.string().min(1, 'Nachname ist erforderlich'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  phone: z.string().optional().nullable(),
});

export type AcceptInvitationData = z.infer<typeof AcceptInvitationSchema>;
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

// Invitation interface for client-side use
export interface Invitation {
  _id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  organizationName: string;
  message?: string;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationData {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  organization: {
    id: string;
    name: string;
  };
  inviter: {
    firstname: string;
    lastname: string;
  };
}
