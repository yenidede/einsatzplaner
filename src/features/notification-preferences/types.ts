import { z } from 'zod';

export type DeliveryMode =
  | 'critical_only'
  | 'digest_only'
  | 'critical_and_digest';

export type MinimumPriority = 'info' | 'review' | 'critical';

export type DigestInterval = 'daily' | 'twice_daily';

export interface OrganizationNotificationDefaults {
  organizationId: string;
  emailEnabledDefault: boolean;
  deliveryModeDefault: DeliveryMode;
  minimumPriorityDefault: MinimumPriority;
  digestIntervalDefault: DigestInterval;
}

export interface UserOrganizationNotificationPreference {
  userId: string;
  organizationId: string;
  useOrganizationDefaults: boolean;
  emailEnabled: boolean | null;
  deliveryMode: DeliveryMode | null;
  minimumPriority: MinimumPriority | null;
  digestInterval: DigestInterval | null;
}

export interface EffectiveNotificationSettings {
  emailEnabled: boolean;
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
  digestInterval: DigestInterval;
}

export interface NotificationPreferenceContext {
  defaults: OrganizationNotificationDefaults;
  preference: UserOrganizationNotificationPreference | null;
}

export interface OrganizationNotificationCardData {
  organizationId: string;
  organizationName: string;
  defaults: OrganizationNotificationDefaults;
  preference: UserOrganizationNotificationPreference | null;
  effective: EffectiveNotificationSettings;
  summary: string;
  source: 'organization' | 'user';
}

export const updateMyNotificationPrimaryInputSchema = z
  .object({
    organizationId: z.string().uuid('Ungültige Organisation.'),
    useOrganizationDefaults: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.useOrganizationDefaults !== undefined ||
      value.emailEnabled !== undefined,
    {
      message: 'Es muss mindestens ein Feld aktualisiert werden.',
      path: ['useOrganizationDefaults'],
    }
  );

export type UpdateMyNotificationPrimaryInput = z.infer<
  typeof updateMyNotificationPrimaryInputSchema
>;

export const updateMyNotificationDetailsInputSchema = z.object({
  organizationId: z.string().uuid('Ungültige Organisation.'),
  deliveryMode: z.enum(['critical_only', 'digest_only', 'critical_and_digest']),
  minimumPriority: z.enum(['info', 'review', 'critical']),
  digestInterval: z.enum(['daily', 'twice_daily']),
});

export type UpdateMyNotificationDetailsInput = z.infer<
  typeof updateMyNotificationDetailsInputSchema
>;

export const updateOrganizationNotificationDefaultsInputSchema = z.object({
  organizationId: z.string().uuid('Ungültige Organisation.'),
  emailEnabledDefault: z.boolean(),
  deliveryModeDefault: z.enum([
    'critical_only',
    'digest_only',
    'critical_and_digest',
  ]),
  minimumPriorityDefault: z.enum(['info', 'review', 'critical']),
  digestIntervalDefault: z.enum(['daily', 'twice_daily']),
});

export type UpdateOrganizationNotificationDefaultsInput = z.infer<
  typeof updateOrganizationNotificationDefaultsInputSchema
>;
