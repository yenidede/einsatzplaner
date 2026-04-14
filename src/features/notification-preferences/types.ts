import { z } from 'zod';
import { isNormalizedTime } from '@/lib/time-input';

export type DeliveryMode =
  | 'critical_only'
  | 'digest_only'
  | 'critical_and_digest';

export type MinimumPriority = 'info' | 'review' | 'critical';
export type PriorityDeliveryMode = 'immediate' | 'digest' | 'off';

export type DigestInterval =
  | 'daily'
  | 'every_2_days'
  | 'every_3_days'
  | 'every_5_days'
  | 'every_7_days';
export type DigestTime = string;

const digestTimeSchema = z
  .string()
  .refine((value) => isNormalizedTime(value), 'Ungültige Uhrzeit.');

export interface OrganizationNotificationDefaults {
  organizationId: string;
  emailEnabledDefault: boolean;
  deliveryModeDefault: DeliveryMode;
  minimumPriorityDefault: MinimumPriority;
  urgentDeliveryDefault: Exclude<PriorityDeliveryMode, 'off'>;
  importantDeliveryDefault: Exclude<PriorityDeliveryMode, 'off'>;
  generalDeliveryDefault: Exclude<PriorityDeliveryMode, 'immediate'>;
  digestIntervalDefault: DigestInterval;
  digestTimeDefault: DigestTime;
  digestSecondTimeDefault: DigestTime;
}

export interface UserOrganizationNotificationPreference {
  userId: string;
  organizationId: string;
  useOrganizationDefaults: boolean;
  emailEnabled: boolean | null;
  deliveryMode: DeliveryMode | null;
  minimumPriority: MinimumPriority | null;
  urgentDelivery: Exclude<PriorityDeliveryMode, 'off'> | null;
  importantDelivery: Exclude<PriorityDeliveryMode, 'off'> | null;
  generalDelivery: Exclude<PriorityDeliveryMode, 'immediate'> | null;
  digestInterval: DigestInterval | null;
  digestTime: DigestTime | null;
  digestSecondTime: DigestTime | null;
}

export interface EffectiveNotificationSettings {
  emailEnabled: boolean;
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
  urgentDelivery: Exclude<PriorityDeliveryMode, 'off'>;
  importantDelivery: Exclude<PriorityDeliveryMode, 'off'>;
  generalDelivery: Exclude<PriorityDeliveryMode, 'immediate'>;
  digestInterval: DigestInterval;
  digestTime: DigestTime;
  digestSecondTime: DigestTime;
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
  urgentDelivery: z.enum(['immediate', 'digest']),
  importantDelivery: z.enum(['immediate', 'digest']),
  generalDelivery: z.enum(['digest', 'off']),
  digestInterval: z.enum([
    'daily',
    'every_2_days',
    'every_3_days',
    'every_5_days',
    'every_7_days',
  ]),
  digestTime: digestTimeSchema,
  digestSecondTime: digestTimeSchema.optional(),
});

export type UpdateMyNotificationDetailsInput = z.infer<
  typeof updateMyNotificationDetailsInputSchema
>;

export const updateOrganizationNotificationDefaultsInputSchema = z.object({
  organizationId: z.string().uuid('Ungültige Organisation.'),
  emailEnabledDefault: z.boolean(),
  deliveryModeDefault: z.enum(['critical_only', 'digest_only', 'critical_and_digest']),
  minimumPriorityDefault: z.enum(['info', 'review', 'critical']),
  urgentDeliveryDefault: z.enum(['immediate', 'digest']).optional(),
  importantDeliveryDefault: z.enum(['immediate', 'digest']).optional(),
  generalDeliveryDefault: z.enum(['digest', 'off']).optional(),
  digestIntervalDefault: z.enum([
    'daily',
    'every_2_days',
    'every_3_days',
    'every_5_days',
    'every_7_days',
  ]),
  digestTimeDefault: digestTimeSchema,
  digestSecondTimeDefault: digestTimeSchema,
});

export type UpdateOrganizationNotificationDefaultsInput = z.infer<
  typeof updateOrganizationNotificationDefaultsInputSchema
>;
