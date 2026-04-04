'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  DeliveryMode,
  DigestInterval,
  MinimumPriority,
  OrganizationNotificationCardData,
} from '../types';
import {
  buildNotificationPreferenceSummary,
  getPreferenceSource,
} from '../notification-preferences-utils';
import { NotificationDefaultBadge } from './NotificationDefaultBadge';
import { NotificationPreferenceDetails } from './NotificationPreferenceDetails';
import { NotificationPreferenceSummary } from './NotificationPreferenceSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

interface OrganizationNotificationCardProps {
  card: OrganizationNotificationCardData;
  isAutoSaving?: boolean;
  isSavingDetails?: boolean;
  onAutoSavePrimary: (input: {
    organizationId: string;
    useOrganizationDefaults?: boolean;
    emailEnabled?: boolean;
  }) => Promise<void>;
  onSaveDetails: (input: {
    organizationId: string;
    deliveryMode: DeliveryMode;
    minimumPriority: MinimumPriority;
    digestInterval: DigestInterval;
  }) => Promise<void>;
}

export function OrganizationNotificationCard({
  card,
  isAutoSaving = false,
  isSavingDetails = false,
  onAutoSavePrimary,
  onSaveDetails,
}: OrganizationNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const effectiveSource = useMemo(
    () => getPreferenceSource(card.preference),
    [card.preference]
  );

  const [useOrganizationDefaults, setUseOrganizationDefaults] = useState(
    effectiveSource === 'organization'
  );
  const [emailEnabled, setEmailEnabled] = useState(card.effective.emailEnabled);
  const [deliveryMode, setDeliveryMode] = useState(card.effective.deliveryMode);
  const [minimumPriority, setMinimumPriority] = useState(
    card.effective.minimumPriority
  );
  const [digestInterval, setDigestInterval] = useState(
    card.effective.digestInterval
  );

  useEffect(() => {
    const source = getPreferenceSource(card.preference);
    setUseOrganizationDefaults(source === 'organization');
    setEmailEnabled(card.effective.emailEnabled);
    setDeliveryMode(card.effective.deliveryMode);
    setMinimumPriority(card.effective.minimumPriority);
    setDigestInterval(card.effective.digestInterval);
  }, [card]);

  const hasUnsavedDetails =
    useOrganizationDefaults === false &&
    emailEnabled === true &&
    (deliveryMode !== card.effective.deliveryMode ||
      minimumPriority !== card.effective.minimumPriority ||
      digestInterval !== card.effective.digestInterval);

  const localSummary = buildNotificationPreferenceSummary({
    source: useOrganizationDefaults ? 'organization' : 'user',
    effective: {
      emailEnabled,
      deliveryMode,
      minimumPriority,
      digestInterval,
    },
  });

  const handleMainToggleChange = async (checked: boolean) => {
    const previousUseDefaults = useOrganizationDefaults;
    const previousEmailEnabled = emailEnabled;

    if (useOrganizationDefaults) {
      setUseOrganizationDefaults(false);
      setEmailEnabled(checked);

      try {
        await onAutoSavePrimary({
          organizationId: card.organizationId,
          useOrganizationDefaults: false,
          emailEnabled: checked,
        });
      } catch {
        setUseOrganizationDefaults(previousUseDefaults);
        setEmailEnabled(previousEmailEnabled);
      }
      return;
    }

    setEmailEnabled(checked);

    try {
      await onAutoSavePrimary({
        organizationId: card.organizationId,
        emailEnabled: checked,
      });
    } catch {
      setEmailEnabled(previousEmailEnabled);
    }
  };

  const handleSourceChange = async (value: string) => {
    const previousUseDefaults = useOrganizationDefaults;
    const previousEmailEnabled = emailEnabled;
    const previousDeliveryMode = deliveryMode;
    const previousMinimumPriority = minimumPriority;
    const previousDigestInterval = digestInterval;

    if (value === 'organization') {
      setUseOrganizationDefaults(true);
      setEmailEnabled(card.defaults.emailEnabledDefault);
      setDeliveryMode(card.defaults.deliveryModeDefault);
      setMinimumPriority(card.defaults.minimumPriorityDefault);
      setDigestInterval(card.defaults.digestIntervalDefault);

      try {
        await onAutoSavePrimary({
          organizationId: card.organizationId,
          useOrganizationDefaults: true,
        });
      } catch {
        setUseOrganizationDefaults(previousUseDefaults);
        setEmailEnabled(previousEmailEnabled);
        setDeliveryMode(previousDeliveryMode);
        setMinimumPriority(previousMinimumPriority);
        setDigestInterval(previousDigestInterval);
      }
      return;
    }

    setUseOrganizationDefaults(false);
    setEmailEnabled(card.effective.emailEnabled);
    setDeliveryMode(card.effective.deliveryMode);
    setMinimumPriority(card.effective.minimumPriority);
    setDigestInterval(card.effective.digestInterval);

    try {
      await onAutoSavePrimary({
        organizationId: card.organizationId,
        useOrganizationDefaults: false,
        emailEnabled: card.effective.emailEnabled,
      });
    } catch {
      setUseOrganizationDefaults(previousUseDefaults);
      setEmailEnabled(previousEmailEnabled);
      setDeliveryMode(previousDeliveryMode);
      setMinimumPriority(previousMinimumPriority);
      setDigestInterval(previousDigestInterval);
    }
  };

  const handleDetailsSave = async () => {
    try {
      await onSaveDetails({
        organizationId: card.organizationId,
        deliveryMode,
        minimumPriority,
        digestInterval,
      });
    } catch {
      // Fehler werden bereits zentral über die Mutation behandelt.
    }
  };

  const handleDetailsReset = () => {
    setDeliveryMode(card.effective.deliveryMode);
    setMinimumPriority(card.effective.minimumPriority);
    setDigestInterval(card.effective.digestInterval);
  };

  const handleHeaderClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (
      target.closest(
        '[data-no-card-toggle],button,input,select,textarea,a,label,[role="button"],[role="switch"]'
      )
    ) {
      return;
    }

    setExpanded((current) => !current);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3" onClick={handleHeaderClick}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1" data-no-card-toggle>
            <CardTitle className="text-base">{card.organizationName}</CardTitle>
            <NotificationPreferenceSummary summary={localSummary} />
          </div>
          <div className="flex items-center gap-2" data-no-card-toggle>
            <NotificationDefaultBadge
              source={useOrganizationDefaults ? 'organization' : 'user'}
            />
            <Switch
              checked={emailEnabled}
              onCheckedChange={handleMainToggleChange}
              disabled={isAutoSaving}
              aria-label={`E-Mail-Benachrichtigungen für ${card.organizationName}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              aria-controls={`notification-details-${card.organizationId}`}
              aria-label={expanded ? 'Details ausblenden' : 'Details anzeigen'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent
          id={`notification-details-${card.organizationId}`}
          className="border-t pt-4"
        >
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">
                Welche Einstellung möchten Sie verwenden?
              </p>
              <RadioGroup
                value={useOrganizationDefaults ? 'organization' : 'user'}
                onValueChange={handleSourceChange}
                className="gap-2"
                disabled={isAutoSaving}
              >
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem
                    id={`notification-source-org-${card.organizationId}`}
                    value="organization"
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`notification-source-org-${card.organizationId}`}
                    >
                      Standardeinstellung der Organisation verwenden
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Die Organisation legt fest, wann und wie E-Mails versendet
                      werden.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-md border p-2">
                  <RadioGroupItem
                    id={`notification-source-user-${card.organizationId}`}
                    value="user"
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`notification-source-user-${card.organizationId}`}
                    >
                      Eigene Einstellung verwenden
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Sie legen für diese Organisation selbst fest, wann Sie
                      E-Mails erhalten.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {useOrganizationDefaults && (
              <p className="text-muted-foreground text-sm">
                Sie verwenden aktuell den Organisation-Standard. Für eigene
                Detailanpassungen wählen Sie bitte „Eigene Einstellung
                verwenden“.
              </p>
            )}

            <NotificationPreferenceDetails
              idPrefix={`notification-${card.organizationId}`}
              emailEnabled={emailEnabled}
              deliveryMode={deliveryMode}
              minimumPriority={minimumPriority}
              digestInterval={digestInterval}
              onDeliveryModeChange={setDeliveryMode}
              onMinimumPriorityChange={setMinimumPriority}
              onDigestIntervalChange={setDigestInterval}
              disabled={
                useOrganizationDefaults || isAutoSaving || isSavingDetails
              }
            />

            {useOrganizationDefaults === false && emailEnabled === true && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDetailsReset}
                  disabled={!hasUnsavedDetails || isSavingDetails}
                >
                  Änderungen verwerfen
                </Button>
                <Button
                  type="button"
                  onClick={handleDetailsSave}
                  disabled={!hasUnsavedDetails || isSavingDetails}
                >
                  Änderungen speichern
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
