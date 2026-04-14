'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, InfoIcon } from 'lucide-react';
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
import { NotificationDefaultBadge } from './NotificationDefaultBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch as EmailSwitch } from '@/components/ui/switch';

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

function getPriorityRuleModes(draft: NotificationCardDraft): {
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
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{title}</p>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        aria-label={title}
        className="flex flex-col gap-2"
      >
        {options.map((option) => {
          const id = `notification-priority-${rowKey}-${organizationId}-${option.value}`;
          return (
            <div
              key={option.value}
              className="hover:border-primary/50 flex items-center gap-3 rounded-md border px-3 py-2 transition-colors"
            >
              <RadioGroupItem id={id} value={option.value} />
              <Label
                htmlFor={id}
                className="cursor-pointer text-sm font-normal"
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
  const [selectedMode, setSelectedMode] =
    useState<SimpleNotificationPreset | null>(null);

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

  const priorityRuleModes = getPriorityRuleModes(draft);
  const hasDigestInIndividualRules =
    priorityRuleModes.urgent === 'digest' ||
    priorityRuleModes.important === 'digest' ||
    priorityRuleModes.general === 'digest';

  const digestFrequencyLabel =
    draft.digestInterval === 'daily'
      ? 'täglich'
      : DIGEST_INTERVAL_LABELS[draft.digestInterval];

  const explanation = !draft.emailEnabled
    ? 'Sie erhalten keine E-Mails.'
    : activePreset === 'important'
      ? 'Dringende und wichtige Meldungen kommen sofort per E-Mail.\nAllgemeine Informationen werden nicht per E-Mail gesendet.'
      : activePreset === 'digest'
        ? `Dringende Meldungen kommen sofort per E-Mail.\nWichtige Meldungen und allgemeine Informationen kommen ${digestFrequencyLabel} um ${draft.digestTime} als Sammelmail.`
        : hasDigestInIndividualRules
          ? `Eigene Regeln je Meldungsstufe.\nSammelmails werden ${digestFrequencyLabel} um ${draft.digestTime} versendet.`
          : 'Eigene Regeln je Meldungsstufe.\nAktuell werden nur Sofort-E-Mails versendet.';

  const showIndividualRules =
    !draft.useOrganizationDefaults &&
    draft.emailEnabled &&
    activePreset === 'individual';

  const showDigestSettings =
    !draft.useOrganizationDefaults &&
    draft.emailEnabled &&
    (activePreset === 'digest' ||
      (activePreset === 'individual' && hasDigestInIndividualRules));

  const detailsId = `notification-details-${card.organizationId}`;

  const handleMainToggleChange = (checked: boolean) => {
    onDraftChange({
      ...draft,
      useOrganizationDefaults: false,
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

    if (value === 'off') {
      onDraftChange({
        ...draft,
        useOrganizationDefaults: false,
        emailEnabled: false,
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
    <Card className="overflow-hidden py-4">
      <CardHeader className="px-4">
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
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CardTitle className="min-w-0 text-base">
                  {card.organizationName}
                </CardTitle>
                <NotificationDefaultBadge
                  source={
                    draft.useOrganizationDefaults ? 'organization' : 'user'
                  }
                />
                <Badge
                  variant={draft.emailEnabled ? 'secondary' : 'outline'}
                  className={
                    draft.emailEnabled
                      ? 'bg-emerald-100 text-[11px] text-emerald-900'
                      : 'border-amber-300 bg-amber-50 text-[11px] text-amber-900'
                  }
                >
                  {draft.emailEnabled ? 'E-Mail aktiv' : 'E-Mail deaktiviert'}
                </Badge>
              </div>
              <NotificationPreferenceSummary
                explanation={explanation}
                className="text-xs sm:text-sm"
              />
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <Label
              htmlFor={`notification-quick-email-${card.organizationId}`}
              className="bg-muted/50 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium"
            >
              E-Mail
              <EmailSwitch
                id={`notification-quick-email-${card.organizationId}`}
                checked={draft.emailEnabled}
                onCheckedChange={handleMainToggleChange}
                disabled={disabled}
                aria-label={`E-Mail für ${card.organizationName} ${draft.emailEnabled ? 'deaktivieren' : 'aktivieren'}`}
              />
            </Label>
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
                <ChevronUp className="text-muted-foreground" aria-hidden />
              ) : (
                <ChevronDown className="text-muted-foreground" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent id={detailsId} className="border-t px-4 pt-4 pb-4">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Welche Einstellung möchten Sie verwenden?
              </p>
              <Tabs
                value={
                  draft.useOrganizationDefaults
                    ? 'organization'
                    : draft.emailEnabled
                      ? 'user'
                      : 'off'
                }
              >
                <TabsList className="grid w-full grid-cols-3 sm:w-fit">
                  <TabsTrigger
                    value="off"
                    disabled={disabled}
                    onClick={() => handleSourceChange('off')}
                  >
                    Keine E-Mails
                  </TabsTrigger>
                  <TabsTrigger
                    value="organization"
                    disabled={disabled}
                    onClick={() => handleSourceChange('organization')}
                  >
                    Organisationsstandard
                  </TabsTrigger>
                  <TabsTrigger
                    value="user"
                    disabled={disabled}
                    onClick={() => handleSourceChange('user')}
                  >
                    Eigene Einstellung
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {draft.useOrganizationDefaults && (
              <p className="text-muted-foreground text-sm">
                Diese Organisation gibt die Benachrichtigungseinstellungen vor.
                Wechseln Sie zu „Eigene Einstellung“, wenn Sie davon abweichende
                Regeln festlegen möchten.
              </p>
            )}

            {!draft.useOrganizationDefaults && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    Wie möchten Sie benachrichtigt werden?
                  </p>
                  <Tabs value={activePreset}>
                    <TabsList className="grid h-auto w-full grid-cols-1 md:grid-cols-3">
                      {SIMPLE_PRESET_OPTIONS.map((option) => (
                        <TabsTrigger
                          key={option.value}
                          value={option.value}
                          disabled={disabled || !draft.emailEnabled}
                          onClick={() => handlePresetChange(option.value)}
                          className="h-auto px-4 py-2 whitespace-normal"
                        >
                          {option.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                {showDigestSettings && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
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

                    <div className="flex flex-col gap-1.5">
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
                  <div className="flex flex-col gap-4 rounded-lg border p-4">
                    <p className="text-sm font-medium">
                      Individuelle Benachrichtigungsregeln
                    </p>
                    <p className="text-muted-foreground">
                      Oben wählen Sie eine einfache Voreinstellung. Hier können
                      Sie für jede Meldungsstufe separat festlegen, ob Sie
                      sofort, gesammelt oder gar nicht per E-Mail informiert
                      werden möchten.
                    </p>

                    <div className="flex flex-col gap-3">
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

                    <div className="text-muted-foreground mt-4 flex flex-row items-start gap-1 text-xs">
                      <InfoIcon
                        className="text-muted-foreground mt-0.5 shrink-0"
                        aria-hidden
                        size={14}
                      />
                      Dringend bedeutet unmittelbarer Handlungsbedarf. Wichtig
                      bedeutet relevant, aber nicht akut. Allgemeine
                      Informationen dienen nur zur Information.
                    </div>
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
