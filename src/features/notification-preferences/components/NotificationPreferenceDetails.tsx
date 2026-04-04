'use client';

import {
  DIGEST_INTERVAL_LABELS,
  DIGEST_INTERVAL_VALUES,
  DELIVERY_MODE_LABELS,
  DELIVERY_MODE_VALUES,
  MINIMUM_PRIORITY_EXPLANATIONS,
  MINIMUM_PRIORITY_LABELS,
  MINIMUM_PRIORITY_VALUES,
} from '../constants';
import {
  deliveryModeUsesDigest,
  isDeliveryMode,
  isDigestInterval,
  isMinimumPriority,
} from '../notification-preferences-utils';
import type { DeliveryMode, DigestInterval, MinimumPriority } from '../types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationPreferenceDetailsProps {
  idPrefix: string;
  emailEnabled: boolean;
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
  digestInterval: DigestInterval;
  onDeliveryModeChange: (value: DeliveryMode) => void;
  onMinimumPriorityChange: (value: MinimumPriority) => void;
  onDigestIntervalChange: (value: DigestInterval) => void;
  disabled?: boolean;
}

export function NotificationPreferenceDetails({
  idPrefix,
  emailEnabled,
  deliveryMode,
  minimumPriority,
  digestInterval,
  onDeliveryModeChange,
  onMinimumPriorityChange,
  onDigestIntervalChange,
  disabled = false,
}: NotificationPreferenceDetailsProps) {
  const detailsDisabled = disabled || !emailEnabled;
  const showDigestInterval =
    emailEnabled && deliveryModeUsesDigest(deliveryMode);
  const minimumPriorityDisabled =
    detailsDisabled || deliveryMode === 'critical_only';

  return (
    <div className="space-y-2">
      {!emailEnabled && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          Sie erhalten derzeit keine E-Mail-Benachrichtigungen für diese
          Organisation. Aktivieren Sie E-Mails, um weitere Optionen festzulegen.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-0">
          <Label htmlFor={`${idPrefix}-delivery-mode`} className="mb-3 block">
            Wie möchten Sie E-Mails erhalten?
          </Label>
          <Select
            value={deliveryMode}
            onValueChange={(value) => {
              if (isDeliveryMode(value)) {
                onDeliveryModeChange(value);
              }
            }}
            disabled={detailsDisabled}
          >
            <SelectTrigger id={`${idPrefix}-delivery-mode`}>
              <SelectValue placeholder="Versandart auswählen" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_MODE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {DELIVERY_MODE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0">
          <Label
            htmlFor={`${idPrefix}-minimum-priority`}
            className="mb-3 block"
          >
            Worüber möchten Sie per E-Mail informiert werden?
          </Label>

          <Select
            value={minimumPriority}
            onValueChange={(value) => {
              if (isMinimumPriority(value)) {
                onMinimumPriorityChange(value);
              }
            }}
            disabled={minimumPriorityDisabled}
          >
            <SelectTrigger id={`${idPrefix}-minimum-priority`}>
              <SelectValue placeholder="Meldungsstufe auswählen" />
            </SelectTrigger>
            <SelectContent>
              {MINIMUM_PRIORITY_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {MINIMUM_PRIORITY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deliveryMode === 'critical_only' && emailEnabled && (
            <p className="text-muted-foreground mt-2 text-xs">
              Bei „Nur dringende Meldungen sofort“ ist diese Auswahl nicht
              relevant.
            </p>
          )}
        </div>
      </div>
      {showDigestInterval && (
        <div className="max-w-sm space-y-0">
          <Label htmlFor={`${idPrefix}-digest-interval`} className="mb-3 block">
            Wie oft soll die Sammelmail gesendet werden?
          </Label>
          <Select
            value={digestInterval}
            onValueChange={(value) => {
              if (isDigestInterval(value)) {
                onDigestIntervalChange(value);
              }
            }}
            disabled={detailsDisabled}
          >
            <SelectTrigger id={`${idPrefix}-digest-interval`}>
              <SelectValue placeholder="Häufigkeit auswählen" />
            </SelectTrigger>
            <SelectContent>
              {DIGEST_INTERVAL_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {DIGEST_INTERVAL_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
