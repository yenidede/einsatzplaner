'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
  OrganizationNotificationCardData,
} from '../types';
import { buildCompactNotificationPreferenceSummary } from '../notification-preferences-utils';
import { NotificationPreferenceDetails } from './NotificationPreferenceDetails';
import { NotificationPreferenceSummary } from './NotificationPreferenceSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

export interface NotificationCardDraft {
  useOrganizationDefaults: boolean;
  emailEnabled: boolean;
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
  digestInterval: DigestInterval;
  digestTime: DigestTime;
  digestSecondTime: DigestTime;
}

interface OrganizationNotificationCardProps {
  card: OrganizationNotificationCardData;
  draft: NotificationCardDraft;
  onDraftChange: (next: NotificationCardDraft) => void;
  disabled?: boolean;
}

export function OrganizationNotificationCard({
  card,
  draft,
  onDraftChange,
  disabled = false,
}: OrganizationNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const localSummary = buildCompactNotificationPreferenceSummary({
    source: draft.useOrganizationDefaults ? 'organization' : 'user',
    effective: {
      emailEnabled: draft.emailEnabled,
      deliveryMode: draft.deliveryMode,
      minimumPriority: draft.minimumPriority,
      digestInterval: draft.digestInterval,
      digestTime: draft.digestTime,
      digestSecondTime: draft.digestSecondTime,
    },
  });

  const handleMainToggleChange = (checked: boolean) => {
    if (draft.useOrganizationDefaults) {
      return;
    }

    onDraftChange({
      ...draft,
      emailEnabled: checked,
    });
  };

  const handleSourceChange = (value: string) => {
    if (value === 'organization') {
      onDraftChange({
        useOrganizationDefaults: true,
        emailEnabled: card.defaults.emailEnabledDefault,
        deliveryMode: card.defaults.deliveryModeDefault,
        minimumPriority: card.defaults.minimumPriorityDefault,
        digestInterval: card.defaults.digestIntervalDefault,
        digestTime: card.defaults.digestTimeDefault,
        digestSecondTime: card.defaults.digestSecondTimeDefault,
      });
      return;
    }

    onDraftChange({
      useOrganizationDefaults: false,
      emailEnabled: card.effective.emailEnabled,
      deliveryMode: card.effective.deliveryMode,
      minimumPriority: card.effective.minimumPriority,
      digestInterval: card.effective.digestInterval,
      digestTime: card.effective.digestTime,
      digestSecondTime: card.effective.digestSecondTime,
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="hover:bg-muted/40 focus-visible:ring-ring/50 min-w-0 flex-1 rounded-md p-1 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-expanded={expanded}
            aria-controls={`notification-details-${card.organizationId}`}
            aria-label={
              expanded
                ? `Details für ${card.organizationName} ausblenden`
                : `Details für ${card.organizationName} anzeigen`
            }
          >
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base">
                {card.organizationName}
              </CardTitle>
              <NotificationPreferenceSummary
                summary={localSummary}
                className="line-clamp-1 text-xs sm:text-sm"
              />
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Label
              htmlFor={`notification-email-enabled-${card.organizationId}`}
              className="text-muted-foreground text-xs"
            >
              {draft.emailEnabled ? 'E-Mail aktiv' : 'E-Mail aus'}
            </Label>
            <Switch
              id={`notification-email-enabled-${card.organizationId}`}
              checked={draft.emailEnabled}
              onCheckedChange={handleMainToggleChange}
              disabled={draft.useOrganizationDefaults || disabled}
              aria-label={`E-Mail-Benachrichtigungen für ${card.organizationName}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              aria-controls={`notification-details-${card.organizationId}`}
              aria-label={
                expanded
                  ? `Details für ${card.organizationName} ausblenden`
                  : `Details für ${card.organizationName} anzeigen`
              }
            >
              {expanded ? (
                <ChevronUp
                  className="text-muted-foreground h-4 w-4"
                  aria-hidden
                />
              ) : (
                <ChevronDown
                  className="text-muted-foreground h-4 w-4"
                  aria-hidden
                />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent
          id={`notification-details-${card.organizationId}`}
          className="border-t px-4 pt-4 pb-4"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                1. Welche Einstellung möchten Sie verwenden?
              </p>
              <RadioGroup
                value={draft.useOrganizationDefaults ? 'organization' : 'user'}
                onValueChange={handleSourceChange}
                className="bg-muted grid w-full grid-cols-2 gap-1 rounded-lg p-1 sm:w-fit"
                disabled={disabled}
              >
                <div>
                  <RadioGroupItem
                    id={`notification-source-org-${card.organizationId}`}
                    value="organization"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`notification-source-org-${card.organizationId}`}
                    className="hover:text-foreground peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground text-muted-foreground flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm font-medium transition-colors peer-data-[state=checked]:shadow-xs"
                  >
                    Organisationsstandard
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    id={`notification-source-user-${card.organizationId}`}
                    value="user"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`notification-source-user-${card.organizationId}`}
                    className="hover:text-foreground peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground text-muted-foreground flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm font-medium transition-colors peer-data-[state=checked]:shadow-xs"
                  >
                    Eigene Einstellung
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {draft.useOrganizationDefaults && (
              <p className="text-muted-foreground text-sm">
                Sie verwenden derzeit den Organisationsstandard.
              </p>
            )}

            <NotificationPreferenceDetails
              idPrefix={`notification-${card.organizationId}`}
              emailEnabled={draft.emailEnabled}
              deliveryMode={draft.deliveryMode}
              minimumPriority={draft.minimumPriority}
              digestInterval={draft.digestInterval}
              digestTime={draft.digestTime}
              digestSecondTime={draft.digestSecondTime}
              onDeliveryModeChange={(deliveryMode) =>
                onDraftChange({ ...draft, deliveryMode })
              }
              onMinimumPriorityChange={(minimumPriority) =>
                onDraftChange({ ...draft, minimumPriority })
              }
              onDigestIntervalChange={(digestInterval) =>
                onDraftChange({ ...draft, digestInterval })
              }
              onDigestTimeChange={(digestTime) =>
                onDraftChange({ ...draft, digestTime })
              }
              onDigestSecondTimeChange={(digestSecondTime) =>
                onDraftChange({ ...draft, digestSecondTime })
              }
              disabled={draft.useOrganizationDefaults || disabled}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
