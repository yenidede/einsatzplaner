'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DIGEST_INTERVAL_LABELS,
  DIGEST_INTERVAL_VALUES,
  DIGEST_TIME_VALUES,
} from '../constants';
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
} from '../types';
import {
  buildCompactNotificationPreferenceSummary,
  deriveLegacyFromRules,
  isDigestInterval,
  isDigestTime,
} from '../notification-preferences-utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrganizationNotificationDefaultsFormProps {
  organizationName: string;
  emailEnabledDefault: boolean;
  deliveryModeDefault: DeliveryMode;
  minimumPriorityDefault: MinimumPriority;
  urgentDeliveryDefault: 'immediate' | 'digest';
  importantDeliveryDefault: 'immediate' | 'digest';
  generalDeliveryDefault: 'digest' | 'off';
  digestIntervalDefault: DigestInterval;
  digestTimeDefault: DigestTime;
  digestSecondTimeDefault: DigestTime;
  onEmailEnabledDefaultChange: (value: boolean) => void;
  onDeliveryModeDefaultChange: (value: DeliveryMode) => void;
  onMinimumPriorityDefaultChange: (value: MinimumPriority) => void;
  onUrgentDeliveryDefaultChange: (value: 'immediate' | 'digest') => void;
  onImportantDeliveryDefaultChange: (value: 'immediate' | 'digest') => void;
  onGeneralDeliveryDefaultChange: (value: 'digest' | 'off') => void;
  onDigestIntervalDefaultChange: (value: DigestInterval) => void;
  onDigestTimeDefaultChange: (value: DigestTime) => void;
  onDigestSecondTimeDefaultChange: (value: DigestTime) => void;
  disabled?: boolean;
}

const PRESET_OPTIONS: ReadonlyArray<{
  value: SimpleNotificationPreset;
  label: string;
}> = [
  { value: 'important', label: 'Nur wichtige Meldungen' },
  { value: 'digest', label: 'Alle Meldungen als Sammelmail' },
  { value: 'individual', label: 'Individuell' },
];

function isSimpleNotificationPreset(
  value: string
): value is SimpleNotificationPreset {
  return value === 'important' || value === 'digest' || value === 'individual';
}

function PriorityRow({
  title,
  value,
  options,
  onChange,
  disabled = false,
}: {
  title: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const rowId = title.toLowerCase().replace(/\s+/g, '-');

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
          const id = `org-notification-priority-${rowId}-${option.value}`;
          return (
            <div
              key={option.value}
              className="hover:border-primary/50 flex items-center gap-3 rounded-md border px-3 py-2 transition-colors"
            >
              <RadioGroupItem id={id} value={option.value} />
              <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
                {option.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

export function OrganizationNotificationDefaultsForm({
  organizationName,
  emailEnabledDefault,
  deliveryModeDefault,
  minimumPriorityDefault,
  urgentDeliveryDefault,
  importantDeliveryDefault,
  generalDeliveryDefault,
  digestIntervalDefault,
  digestTimeDefault,
  digestSecondTimeDefault,
  onEmailEnabledDefaultChange,
  onDeliveryModeDefaultChange,
  onMinimumPriorityDefaultChange,
  onUrgentDeliveryDefaultChange,
  onImportantDeliveryDefaultChange,
  onGeneralDeliveryDefaultChange,
  onDigestIntervalDefaultChange,
  onDigestTimeDefaultChange,
  onDigestSecondTimeDefaultChange,
  disabled = false,
}: OrganizationNotificationDefaultsFormProps) {
  const activePreset = resolveSimpleNotificationPreset({
    emailEnabled: emailEnabledDefault,
    urgentDelivery: urgentDeliveryDefault,
    importantDelivery: importantDeliveryDefault,
    generalDelivery: generalDeliveryDefault,
  });

  const hasDigestInRules =
    urgentDeliveryDefault === 'digest' ||
    importantDeliveryDefault === 'digest' ||
    generalDeliveryDefault === 'digest';

  const showIndividualRules =
    emailEnabledDefault && activePreset === 'individual';
  const showDigestSettings =
    emailEnabledDefault &&
    (activePreset === 'digest' ||
      (activePreset === 'individual' && hasDigestInRules));

  const summary = buildCompactNotificationPreferenceSummary({
    source: 'organization',
    effective: {
      emailEnabled: emailEnabledDefault,
      deliveryMode: deliveryModeDefault,
      minimumPriority: minimumPriorityDefault,
      urgentDelivery: urgentDeliveryDefault,
      importantDelivery: importantDeliveryDefault,
      generalDelivery: generalDeliveryDefault,
      digestInterval: digestIntervalDefault,
      digestTime: digestTimeDefault,
      digestSecondTime: digestSecondTimeDefault,
    },
  });

  const applyRuleModes = (modes: {
    urgent: 'immediate' | 'digest';
    important: 'immediate' | 'digest';
    general: 'digest' | 'off';
  }) => {
    const legacy = deriveLegacyFromRules({
      urgentDelivery: modes.urgent,
      importantDelivery: modes.important,
      generalDelivery: modes.general,
    });

    onUrgentDeliveryDefaultChange(modes.urgent);
    onImportantDeliveryDefaultChange(modes.important);
    onGeneralDeliveryDefaultChange(modes.general);
    onDeliveryModeDefaultChange(legacy.deliveryMode);
    onMinimumPriorityDefaultChange(legacy.minimumPriority);
  };

  const handlePresetChange = (value: string) => {
    if (!isSimpleNotificationPreset(value)) {
      return;
    }

    if (value === 'individual') {
      return;
    }

    const applied = applySimpleNotificationPreset(
      {
        emailEnabled: emailEnabledDefault,
        deliveryMode: deliveryModeDefault,
        minimumPriority: minimumPriorityDefault,
        urgentDelivery: urgentDeliveryDefault,
        importantDelivery: importantDeliveryDefault,
        generalDelivery: generalDeliveryDefault,
        digestInterval: digestIntervalDefault,
        digestTime: digestTimeDefault,
        digestSecondTime: digestSecondTimeDefault,
      },
      value
    );

    onEmailEnabledDefaultChange(applied.emailEnabled);
    onDeliveryModeDefaultChange(applied.deliveryMode);
    onMinimumPriorityDefaultChange(applied.minimumPriority);
    onUrgentDeliveryDefaultChange(applied.urgentDelivery);
    onImportantDeliveryDefaultChange(applied.importantDelivery);
    onGeneralDeliveryDefaultChange(applied.generalDelivery);
  };

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

      {!emailEnabledDefault && (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Mitglieder erhalten keine E-Mails. Hinweise sehen Sie weiterhin in der
          App.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Wie möchten Sie benachrichtigt werden?
        </p>
        <RadioGroup
          value={activePreset}
          onValueChange={handlePresetChange}
          disabled={disabled || !emailEnabledDefault}
          className="grid gap-2 sm:grid-cols-3"
        >
          {PRESET_OPTIONS.map((option) => {
            const id = `org-notification-preset-${option.value}`;
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
                  {option.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {showDigestSettings && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-notification-digest-interval">Häufigkeit</Label>
            <Select
              value={digestIntervalDefault}
              onValueChange={(value) => {
                if (isDigestInterval(value)) {
                  onDigestIntervalDefaultChange(value);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger id="org-notification-digest-interval">
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
            <Label htmlFor="org-notification-digest-time">Uhrzeit</Label>
            <Select
              value={digestTimeDefault}
              onValueChange={(value) => {
                if (isDigestTime(value)) {
                  onDigestTimeDefaultChange(value);
                  if (digestSecondTimeDefault === value) {
                    const fallbackSecondTime = DIGEST_TIME_VALUES.find(
                      (entry) => entry !== value
                    );
                    if (fallbackSecondTime) {
                      onDigestSecondTimeDefaultChange(fallbackSecondTime);
                    }
                  }
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger id="org-notification-digest-time">
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
          <p className="text-muted-foreground">
            Die einfache Auswahl oben setzt eine Voreinstellung. Hier können Sie
            diese bei Bedarf anpassen.
          </p>

          <div className="space-y-3">
            <PriorityRow
              title="Dringende Meldungen"
              value={urgentDeliveryDefault}
              options={[
                { value: 'immediate', label: 'Sofort per E-Mail' },
                { value: 'digest', label: 'Als Sammelmail' },
              ]}
              onChange={(value) => {
                if (value !== 'immediate' && value !== 'digest') {
                  return;
                }

                applyRuleModes({
                  urgent: value,
                  important: importantDeliveryDefault,
                  general: generalDeliveryDefault,
                });
              }}
              disabled={disabled}
            />

            <PriorityRow
              title="Wichtige Meldungen"
              value={importantDeliveryDefault}
              options={[
                { value: 'immediate', label: 'Sofort per E-Mail' },
                { value: 'digest', label: 'Als Sammelmail' },
              ]}
              onChange={(value) => {
                if (value !== 'immediate' && value !== 'digest') {
                  return;
                }

                applyRuleModes({
                  urgent: urgentDeliveryDefault,
                  important: value,
                  general: generalDeliveryDefault,
                });
              }}
              disabled={disabled}
            />

            <PriorityRow
              title="Allgemeine Informationen"
              value={generalDeliveryDefault}
              options={[
                { value: 'digest', label: 'Als Sammelmail' },
                { value: 'off', label: 'Keine E-Mail' },
              ]}
              onChange={(value) => {
                if (value !== 'digest' && value !== 'off') {
                  return;
                }

                applyRuleModes({
                  urgent: urgentDeliveryDefault,
                  important: importantDeliveryDefault,
                  general: value,
                });
              }}
              disabled={disabled}
            />
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Dringend = sofortiger Handlungsbedarf, wichtig = relevant, aber
            nicht akut, allgemein = reine Information.
          </p>
        </div>
      )}
    </div>
  );
}
