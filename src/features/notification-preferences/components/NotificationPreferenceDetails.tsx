'use client';

import {
  DIGEST_INTERVAL_LABELS,
  DIGEST_INTERVAL_VALUES,
  DIGEST_TIME_VALUES,
  DELIVERY_MODE_LABELS,
  DELIVERY_MODE_VALUES,
  MINIMUM_PRIORITY_LABELS,
  MINIMUM_PRIORITY_VALUES,
} from '../constants';
import {
  deliveryModeUsesDigest,
  isDeliveryMode,
  isDigestInterval,
  isDigestTime,
  isMinimumPriority,
} from '../notification-preferences-utils';
import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
} from '../types';
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
  digestTime: DigestTime;
  digestSecondTime: DigestTime;
  onDeliveryModeChange: (value: DeliveryMode) => void;
  onMinimumPriorityChange: (value: MinimumPriority) => void;
  onDigestIntervalChange: (value: DigestInterval) => void;
  onDigestTimeChange: (value: DigestTime) => void;
  onDigestSecondTimeChange: (value: DigestTime) => void;
  disabled?: boolean;
}

export function NotificationPreferenceDetails({
  idPrefix,
  emailEnabled,
  deliveryMode,
  minimumPriority,
  digestInterval,
  digestTime,
  digestSecondTime,
  onDeliveryModeChange,
  onMinimumPriorityChange,
  onDigestIntervalChange,
  onDigestTimeChange,
  onDigestSecondTimeChange,
  disabled = false,
}: NotificationPreferenceDetailsProps) {
  const detailsDisabled = disabled || !emailEnabled;
  const showDigestSettings =
    emailEnabled && deliveryModeUsesDigest(deliveryMode);
  const minimumPriorityDisabled =
    detailsDisabled || deliveryMode === 'critical_only';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-delivery-mode`}>
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

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-minimum-priority`}>
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
            <p className="text-muted-foreground text-xs">
              Bei „Nur dringende Meldungen sofort“ ist diese Auswahl nicht
              relevant.
            </p>
          )}
        </div>
      </div>

      {showDigestSettings && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-digest-interval`}>
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

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-digest-time`}>
              Versandzeit für Sammelmail
            </Label>
            <Select
              value={digestTime}
              onValueChange={(value) => {
                if (isDigestTime(value)) {
                  onDigestTimeChange(value);
                  if (digestSecondTime === value) {
                    const fallbackSecondTime = DIGEST_TIME_VALUES.find(
                      (entry) => entry !== value
                    );
                    if (fallbackSecondTime) {
                      onDigestSecondTimeChange(fallbackSecondTime);
                    }
                  }
                }
              }}
              disabled={detailsDisabled}
            >
              <SelectTrigger id={`${idPrefix}-digest-time`}>
                <SelectValue placeholder="Zeit auswählen" />
              </SelectTrigger>
              <SelectContent>
                {DIGEST_TIME_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
