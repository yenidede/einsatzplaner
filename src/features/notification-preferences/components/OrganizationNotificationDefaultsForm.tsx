'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { NotificationPreferenceDetails } from './NotificationPreferenceDetails';
import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
} from '../types';
import { buildNotificationPreferenceSummary } from '../notification-preferences-utils';

interface OrganizationNotificationDefaultsFormProps {
  organizationName: string;
  emailEnabledDefault: boolean;
  deliveryModeDefault: DeliveryMode;
  minimumPriorityDefault: MinimumPriority;
  digestIntervalDefault: DigestInterval;
  digestTimeDefault: DigestTime;
  digestSecondTimeDefault: DigestTime;
  onEmailEnabledDefaultChange: (value: boolean) => void;
  onDeliveryModeDefaultChange: (value: DeliveryMode) => void;
  onMinimumPriorityDefaultChange: (value: MinimumPriority) => void;
  onDigestIntervalDefaultChange: (value: DigestInterval) => void;
  onDigestTimeDefaultChange: (value: DigestTime) => void;
  onDigestSecondTimeDefaultChange: (value: DigestTime) => void;
  disabled?: boolean;
}

export function OrganizationNotificationDefaultsForm({
  organizationName,
  emailEnabledDefault,
  deliveryModeDefault,
  minimumPriorityDefault,
  digestIntervalDefault,
  digestTimeDefault,
  digestSecondTimeDefault,
  onEmailEnabledDefaultChange,
  onDeliveryModeDefaultChange,
  onMinimumPriorityDefaultChange,
  onDigestIntervalDefaultChange,
  onDigestTimeDefaultChange,
  onDigestSecondTimeDefaultChange,
  disabled = false,
}: OrganizationNotificationDefaultsFormProps) {
  const summary = buildNotificationPreferenceSummary({
    source: 'organization',
      effective: {
        emailEnabled: emailEnabledDefault,
        deliveryMode: deliveryModeDefault,
        minimumPriority: minimumPriorityDefault,
        digestInterval: digestIntervalDefault,
        digestTime: digestTimeDefault,
        digestSecondTime: digestSecondTimeDefault,
      },
    });

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Standard-Einstellungen für {organizationName}
            </p>
            <p className="text-muted-foreground text-sm">{summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="org-email-notification-enabled">
              E-Mail-Benachrichtigungen
            </Label>
            <Switch
              id="org-email-notification-enabled"
              checked={emailEnabledDefault}
              onCheckedChange={onEmailEnabledDefaultChange}
              disabled={disabled}
              aria-label="Standard E-Mail-Benachrichtigungen aktivieren"
            />
          </div>
        </div>
      </div>

      <NotificationPreferenceDetails
        idPrefix="org-notification-defaults"
        emailEnabled={emailEnabledDefault}
        deliveryMode={deliveryModeDefault}
        minimumPriority={minimumPriorityDefault}
        digestInterval={digestIntervalDefault}
        digestTime={digestTimeDefault}
        digestSecondTime={digestSecondTimeDefault}
        onDeliveryModeChange={onDeliveryModeDefaultChange}
        onMinimumPriorityChange={onMinimumPriorityDefaultChange}
        onDigestIntervalChange={onDigestIntervalDefaultChange}
        onDigestTimeChange={onDigestTimeDefaultChange}
        onDigestSecondTimeChange={onDigestSecondTimeDefaultChange}
        disabled={disabled}
      />
    </div>
  );
}
