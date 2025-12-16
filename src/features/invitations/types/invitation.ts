import { z } from 'zod';

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired'
} as const;

export type InvitationStatus = typeof InvitationStatus[keyof typeof InvitationStatus];

export interface Invitation {
  id: string;
  email: string;
  organization_id: string; 
  role_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  organization: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
  } | null;
  inviter?: {
    firstname: string;
    lastname: string;
  } | null;
}

export interface InvitationValidation {
  valid: boolean;
  invitation?: Invitation;
  error?: string;
}

export interface InviteUserFormData {
  email: string;
  organization_id?: string;
  organizationId?: string;
  role_id?: string;
  roleId?: string;
}

export interface CreateInvitationData {
  email: string;
  organizationId: string;
  roleIds: string[];
}

export interface AcceptInvitationResult {
  success: boolean;
  message?: string;
  data?: any;
}

export const InviteUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  firstname: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben'),
  lastname: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben'),
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
