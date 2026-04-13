'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DIGEST_INTERVAL_LABELS,
  DIGEST_INTERVAL_VALUES,
  DIGEST_TIME_VALUES,
} from '../constants';
import {
  deriveLegacyFromRules,
  isDigestInterval,
  isDigestTime,
} from '../notification-preferences-utils';
import {
  applySimpleNotificationPreset,
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
  urgentDelivery: 'immediate' | 'digest';
  importantDelivery: 'immediate' | 'digest';
  generalDelivery: 'digest' | 'off';
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

type PriorityRuleMode = 'immediate' | 'digest' | 'off';

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
  {
    value: 'individual',
    title: 'Individuell',
  },
];

function isSimpleNotificationPreset(
  value: string
): value is SimpleNotificationPreset {
  return value === 'important' || value === 'digest' || value === 'individual';
}

function getPriorityRuleModes(
  draft: NotificationCardDraft
): {
  urgent: Extract<PriorityRuleMode, 'immediate' | 'digest'>;
  important: Extract<PriorityRuleMode, 'immediate' | 'digest'>;
  general: Extract<PriorityRuleMode, 'digest' | 'off'>;
} {
  return {
    urgent: draft.urgentDelivery,
    important: draft.importantDelivery,
    general: draft.generalDelivery,
  };
}

function applyPriorityRuleModes(
  draft: NotificationCardDraft,
  modes: {
    urgent: Extract<PriorityRuleMode, 'immediate' | 'digest'>;
    important: Extract<PriorityRuleMode, 'immediate' | 'digest'>;
    general: Extract<PriorityRuleMode, 'digest' | 'off'>;
  }
): NotificationCardDraft {
  const legacy = deriveLegacyFromRules({
    urgentDelivery: modes.urgent,
    importantDelivery: modes.important,
    generalDelivery: modes.general,
  });

  return {
    ...draft,
    deliveryMode: legacy.deliveryMode,
    minimumPriority: legacy.minimumPriority,
    urgentDelivery: modes.urgent,
    importantDelivery: modes.important,
    generalDelivery: modes.general,
  };
}

function PriorityRow({
  title,
  value,
  options,
  onChange,
  disabled = false,
  organizationId,
  rowKey,
}: {
  title: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  organizationId: string;
  rowKey: string;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
      <p className="text-sm font-medium">{title}</p>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="grid grid-cols-2 gap-2"
      >
        {options.map((option) => {
          const id = `notification-priority-${rowKey}-${organizationId}-${option.value}`;
          return (
            <div key={option.value}>
              <RadioGroupItem id={id} value={option.value} className="peer sr-only" />
              <Label
                htmlFor={id}
                className="peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 flex min-h-10 min-w-40 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm transition-colors"
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

export function OrganizationNotificationCard({
  card,
  draft,
  onDraftChange,
  disabled = false,
}: OrganizationNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedMode, setSelectedMode] = useState<SimpleNotificationPreset | null>(
    null
  );

  useEffect(() => {
    if (draft.useOrganizationDefaults) {
      setSelectedMode(null);
    }
  }, [draft.useOrganizationDefaults]);

  const derivedPreset = resolveSimpleNotificationPreset({
    emailEnabled: draft.emailEnabled,
    urgentDelivery: draft.urgentDelivery,
    importantDelivery: draft.importantDelivery,
    generalDelivery: draft.generalDelivery,
  });
  const activePreset = selectedMode ?? derivedPreset;

  const sourceLabel = draft.useOrganizationDefaults
    ? 'Organisationsstandard'
    : 'Eigene Einstellung';

  const digestFrequencyLabel =
    draft.digestInterval === 'daily' ? 'täglich' : 'alle 2 Tage';

  const summary =
    !draft.emailEnabled
      ? `${sourceLabel}: E-Mail-Benachrichtigungen deaktiviert`
      : activePreset === 'important'
        ? `${sourceLabel}: Nur wichtige Meldungen`
        : activePreset === 'digest'
          ? `${sourceLabel}: Sammelmail ${digestFrequencyLabel} um ${draft.digestTime}`
          : `${sourceLabel}: Individuell angepasst`;

  const priorityRuleModes = getPriorityRuleModes(draft);
  const hasDigestInIndividualRules =
    priorityRuleModes.urgent === 'digest' ||
    priorityRuleModes.important === 'digest' ||
    priorityRuleModes.general === 'digest';

  const showIndividualRules =
    !draft.useOrganizationDefaults && draft.emailEnabled && activePreset === 'individual';

  const showDigestSettings =
    !draft.useOrganizationDefaults &&
    draft.emailEnabled &&
    (activePreset === 'digest' ||
      (activePreset === 'individual' && hasDigestInIndividualRules));

  const detailsId = `notification-details-${card.organizationId}`;

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

    setSelectedMode(value);

    if (value === 'individual') {
      return;
    }

    onDraftChange(applySimpleNotificationPreset(draft, value));
  };

  const handleSourceChange = (value: string) => {
    setSelectedMode(null);

    if (value === 'organization') {
      onDraftChange({
        useOrganizationDefaults: true,
        emailEnabled: card.defaults.emailEnabledDefault,
        deliveryMode: card.defaults.deliveryModeDefault,
        minimumPriority: card.defaults.minimumPriorityDefault,
        urgentDelivery: card.defaults.urgentDeliveryDefault,
        importantDelivery: card.defaults.importantDeliveryDefault,
        generalDelivery: card.defaults.generalDeliveryDefault,
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
      urgentDelivery: card.effective.urgentDelivery,
      importantDelivery: card.effective.importantDelivery,
      generalDelivery: card.effective.generalDelivery,
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
              <CardTitle className="text-base">{card.organizationName}</CardTitle>
              <NotificationPreferenceSummary
                summary={summary}
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
              <ChevronUp className="text-muted-foreground h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="text-muted-foreground h-4 w-4" aria-hidden />
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
                    value={activePreset}
                    onValueChange={handlePresetChange}
                    disabled={disabled || !draft.emailEnabled}
                    className="grid gap-2 sm:grid-cols-3"
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
                            className="peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm transition-colors"
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
                        Uhrzeit
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

                {showIndividualRules && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <p className="text-sm font-medium">
                      Individuelle Benachrichtigungsregeln
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Legen Sie fest, wie einzelne Meldungsstufen behandelt werden.
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Die einfache Auswahl oben setzt eine Voreinstellung. Hier
                      können Sie diese bei Bedarf anpassen.
                    </p>

                    <div className="space-y-3">
                      <PriorityRow
                        organizationId={card.organizationId}
                        rowKey="urgent"
                        title="Dringende Meldungen"
                        value={priorityRuleModes.urgent}
                        options={[
                          { value: 'immediate', label: 'Sofort per E-Mail' },
                          { value: 'digest', label: 'Als Sammelmail' },
                        ]}
                        onChange={(value) => {
                          if (value !== 'immediate' && value !== 'digest') {
                            return;
                          }

                          setSelectedMode('individual');
                          onDraftChange(
                            applyPriorityRuleModes(draft, {
                              ...priorityRuleModes,
                              urgent: value,
                            })
                          );
                        }}
                        disabled={disabled}
                      />

                      <PriorityRow
                        organizationId={card.organizationId}
                        rowKey="important"
                        title="Wichtige Meldungen"
                        value={priorityRuleModes.important}
                        options={[
                          { value: 'immediate', label: 'Sofort per E-Mail' },
                          { value: 'digest', label: 'Als Sammelmail' },
                        ]}
                        onChange={(value) => {
                          if (value !== 'digest' && value !== 'immediate') {
                            return;
                          }

                          setSelectedMode('individual');
                          onDraftChange(
                            applyPriorityRuleModes(draft, {
                              ...priorityRuleModes,
                              important: value,
                            })
                          );
                        }}
                        disabled={disabled}
                      />

                      <PriorityRow
                        organizationId={card.organizationId}
                        rowKey="general"
                        title="Allgemeine Informationen"
                        value={priorityRuleModes.general}
                        options={[
                          { value: 'digest', label: 'Als Sammelmail' },
                          { value: 'off', label: 'Keine E-Mail' },
                        ]}
                        onChange={(value) => {
                          if (value !== 'digest' && value !== 'off') {
                            return;
                          }

                          setSelectedMode('individual');
                          onDraftChange(
                            applyPriorityRuleModes(draft, {
                              ...priorityRuleModes,
                              general: value,
                            })
                          );
                        }}
                        disabled={disabled}
                      />
                    </div>

                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Dringend = sofortiger Handlungsbedarf, wichtig = relevant,
                      aber nicht akut, allgemein = reine Information.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
