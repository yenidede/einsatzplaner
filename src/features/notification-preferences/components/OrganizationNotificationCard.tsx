'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DIGEST_INTERVAL_LABELS,
  DIGEST_INTERVAL_VALUES,
  DIGEST_TIME_VALUES,
} from '../constants';
import {
  buildCompactNotificationPreferenceSummary,
  isDigestInterval,
  isDigestTime,
} from '../notification-preferences-utils';
import {
  applySimpleNotificationPreset,
  applyUrgentImmediateOverride,
  isUrgentImmediateEnabled,
  resolveSimpleNotificationPreset,
  type SimpleNotificationPreset,
} from '../simple-notification-presets';
import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
  OrganizationNotificationCardData,
} from '../types';
import { NotificationPreferenceSummary } from './NotificationPreferenceSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const SIMPLE_PRESET_OPTIONS: ReadonlyArray<{
  value: SimpleNotificationPreset;
  title: string;
}> = [
  {
    value: 'important',
    title: 'Nur wichtige Meldungen',
  },
  {
    value: 'digest',
    title: 'Alle Meldungen als Sammelmail',
  },
];

function isSimpleNotificationPreset(
  value: string
): value is SimpleNotificationPreset {
  return value === 'none' || value === 'important' || value === 'digest';
}

export function OrganizationNotificationCard({
  card,
  draft,
  onDraftChange,
  disabled = false,
}: OrganizationNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

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

  const selectedPreset = resolveSimpleNotificationPreset({
    emailEnabled: draft.emailEnabled,
    minimumPriority: draft.minimumPriority,
  });
  const urgentImmediateEnabled = isUrgentImmediateEnabled(draft.deliveryMode);
  const showDigestSettings =
    draft.emailEnabled &&
    (selectedPreset === 'digest' || !urgentImmediateEnabled);

  const detailsId = `notification-details-${card.organizationId}`;
  const advancedSectionId = `notification-advanced-${card.organizationId}`;

  const handleMainToggleChange = (checked: boolean) => {
    if (draft.useOrganizationDefaults) {
      return;
    }

    onDraftChange({
      ...draft,
      emailEnabled: checked,
    });
  };

  const handlePresetChange = (value: string) => {
    if (draft.useOrganizationDefaults || !isSimpleNotificationPreset(value)) {
      return;
    }

    onDraftChange(applySimpleNotificationPreset(draft, value));
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
            aria-controls={detailsId}
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

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls={detailsId}
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
      </CardHeader>

      {expanded && (
        <CardContent id={detailsId} className="border-t px-4 pt-4 pb-4">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Welche Einstellung möchten Sie verwenden?
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

            {!draft.useOrganizationDefaults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor={`notification-email-enabled-${card.organizationId}`}
                    className="text-sm font-medium"
                  >
                    E-Mail-Benachrichtigungen
                  </Label>
                  <Switch
                    id={`notification-email-enabled-${card.organizationId}`}
                    checked={draft.emailEnabled}
                    onCheckedChange={handleMainToggleChange}
                    disabled={disabled}
                    aria-label={`E-Mail-Benachrichtigungen für ${card.organizationName}`}
                  />
                </div>

                {!draft.emailEnabled && (
                  <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                    Sie erhalten keine E-Mails. Hinweise sehen Sie weiterhin in
                    der App.
                  </p>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Wie möchten Sie benachrichtigt werden?
                  </p>
                  <RadioGroup
                    value={selectedPreset}
                    onValueChange={handlePresetChange}
                    disabled={disabled || !draft.emailEnabled}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {SIMPLE_PRESET_OPTIONS.map((option) => {
                      const id = `notification-preset-${card.organizationId}-${option.value}`;
                      return (
                        <div key={option.value}>
                          <RadioGroupItem
                            id={id}
                            value={option.value}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={id}
                            className="peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-sm transition-colors"
                          >
                            {option.title}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {showDigestSettings && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`notification-digest-interval-${card.organizationId}`}
                      >
                        Häufigkeit
                      </Label>
                      <Select
                        value={draft.digestInterval}
                        onValueChange={(value) => {
                          if (isDigestInterval(value)) {
                            onDraftChange({ ...draft, digestInterval: value });
                          }
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          id={`notification-digest-interval-${card.organizationId}`}
                        >
                          <SelectValue placeholder="Häufigkeit wählen" />
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
                      <Label
                        htmlFor={`notification-digest-time-${card.organizationId}`}
                      >
                        Uhrzeit (optional)
                      </Label>
                      <Select
                        value={draft.digestTime}
                        onValueChange={(value) => {
                          if (isDigestTime(value)) {
                            onDraftChange({ ...draft, digestTime: value });
                          }
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger
                          id={`notification-digest-time-${card.organizationId}`}
                        >
                          <SelectValue placeholder="Uhrzeit wählen" />
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

                <div className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setAdvancedExpanded((current) => !current)}
                    className="hover:bg-muted/40 focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    aria-expanded={advancedExpanded}
                    aria-controls={advancedSectionId}
                  >
                    <span className="text-sm font-medium">
                      Erweiterte Einstellungen
                    </span>
                    {advancedExpanded ? (
                      <ChevronUp className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    )}
                  </button>

                  {advancedExpanded && (
                    <div
                      id={advancedSectionId}
                      className="space-y-3 border-t p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`notification-urgent-immediate-${card.organizationId}`}
                          checked={urgentImmediateEnabled}
                          onCheckedChange={(checked) => {
                            if (checked === 'indeterminate') {
                              return;
                            }

                            onDraftChange(
                              applyUrgentImmediateOverride(draft, checked)
                            );
                          }}
                          disabled={disabled || !draft.emailEnabled}
                        />
                        <Label
                          htmlFor={`notification-urgent-immediate-${card.organizationId}`}
                          className="text-sm font-medium"
                        >
                          Dringende Meldungen immer sofort senden
                        </Label>
                      </div>

                      <p className="text-muted-foreground text-xs">
                        Weitere erweiterte Optionen folgen in einem späteren
                        Schritt.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
