'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, ExternalLink } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { MultiSelect } from '@/components/form/multi-select';
import { TimeTextInput } from '@/components/form/TimeTextInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useCategories } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useStatuses } from '@/features/einsatz_status/hooks/useStatuses';
import {
  calendarExportConfigSchema,
  getBlankCalendarExportConfig,
  type CalendarExportConfig,
  type CalendarExportMode,
} from '@/features/calendar-subscription/config';
import {
  useCalendarExportPreview,
  useCompatibleCalendarExportTemplates,
  type CalendarExport,
  type CalendarExportEligibility,
} from '@/features/calendar-subscription/hooks/useCalendarSubscription';
import { cn } from '@/lib/utils';
import {
  getCalendarExportNameAfterOrgChange,
  getPreviewDurationTag,
} from './CalendarExportDialog.utils';

const formSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(1, 'Der Name ist erforderlich.'),
  description: z.string().optional(),
  config: calendarExportConfigSchema,
});

type FormValues = z.infer<typeof formSchema>;
type FormInputValues = z.input<typeof formSchema>;
type SavedExport = {
  name: string;
  webcalUrl: string;
  httpUrl: string;
};

type CalendarExportTemplateChoice = {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  config: CalendarExportConfig;
};

type CalendarExportDialogProps = {
  open: boolean;
  mode: 'personal' | 'template';
  eligibility: CalendarExportEligibility[];
  initialOrgId?: string | null;
  exportToEdit?: CalendarExport | null;
  templateToEdit?: CalendarExportTemplateChoice | null;
  onOpenChange: (open: boolean) => void;
  onSavePersonal?: (input: {
    id?: string;
    orgId: string;
    name: string;
    config: CalendarExportConfig;
  }) => Promise<SavedExport | void>;
  onSaveTemplate?: (input: {
    id?: string;
    orgId: string;
    name: string;
    description?: string | null;
    config: CalendarExportConfig;
  }) => Promise<void>;
};

const steps = [
  { id: 'general', label: 'Allgemein' },
  { id: 'filters', label: 'Filter' },
  { id: 'preview', label: 'Vorschau' },
] as const;

function getInitialStepIndex(input: {
  exportToEdit?: CalendarExport | null;
  templateToEdit?: CalendarExportTemplateChoice | null;
}) {
  return input.exportToEdit || input.templateToEdit ? 1 : 0;
}

function buildInitialValues(input: {
  eligibility: CalendarExportEligibility[];
  initialOrgId?: string | null;
  exportToEdit?: CalendarExport | null;
  templateToEdit?: CalendarExportTemplateChoice | null;
}): FormValues {
  if (input.exportToEdit) {
    return {
      orgId: input.exportToEdit.orgId,
      name: input.exportToEdit.name,
      description: '',
      config: input.exportToEdit.config,
    };
  }

  if (input.templateToEdit) {
    return {
      orgId: input.templateToEdit.orgId,
      name: input.templateToEdit.name,
      description: input.templateToEdit.description ?? '',
      config: input.templateToEdit.config,
    };
  }

  const fallbackOrgId =
    input.initialOrgId ?? input.eligibility[0]?.organization.id ?? '';
  return {
    orgId: fallbackOrgId,
    name: '',
    description: '',
    config: getBlankCalendarExportConfig('helper'),
  };
}

function modeLabel(mode: CalendarExportMode) {
  return mode === 'helper' ? 'Helfer' : 'Verwaltung';
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} passende${count === 1 ? `r ${singular}` : ` ${plural}`}`;
}

function formatPreviewDate(input: {
  start: string;
  end: string;
  allDay: boolean;
}) {
  const start = new Date(input.start);
  const end = new Date(input.end);

  if (input.allDay) {
    return start.toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return `${start.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}, ${start.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
  })}-${end.toLocaleTimeString('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function selectedTitlePartCount(config: CalendarExportConfig) {
  return [
    config.titleAdditions.assignedHelperNames,
    config.titleAdditions.eventTitle,
    config.titleAdditions.categories,
    config.titleAdditions.helperCount,
  ].filter(Boolean).length;
}

export function CalendarExportDialog(props: CalendarExportDialogProps) {
  const { eligibility, exportToEdit, initialOrgId, open, templateToEdit } =
    props;
  const [stepIndex, setStepIndex] = useState(0);
  const [savedExport, setSavedExport] = useState<SavedExport | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('custom');
  const [timeWindowDraft, setTimeWindowDraft] = useState({ from: '', to: '' });
  const [timeWindowErrors, setTimeWindowErrors] = useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });
  const { showDestructive } = useConfirmDialog();

  const form = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildInitialValues({
      eligibility,
      exportToEdit,
      initialOrgId,
      templateToEdit,
    }),
  });

  const orgId = useWatch({ control: form.control, name: 'orgId' });
  const watchedConfig = useWatch({ control: form.control, name: 'config' });
  const config = calendarExportConfigSchema.parse(watchedConfig);
  const selectedEligibility = props.eligibility.find(
    (item) => item.organization.id === orgId
  );
  const selectedOrg = selectedEligibility?.organization;
  const categoriesQuery = useCategories(orgId);
  const statusesQuery = useStatuses();
  const templatesQuery = useCompatibleCalendarExportTemplates(
    props.mode === 'personal' ? orgId : null
  );
  const previewQuery = useCalendarExportPreview(orgId, config);
  const titlePartCount = selectedTitlePartCount(config);

  const availableModes = selectedEligibility?.modes ?? (['helper'] as const);

  useEffect(() => {
    if (!open) {
      return;
    }
    const initialValues = buildInitialValues({
      eligibility,
      exportToEdit,
      initialOrgId,
      templateToEdit,
    });
    form.reset(initialValues);
    setTimeWindowDraft({
      from: initialValues.config.timeWindow?.from ?? '',
      to: initialValues.config.timeWindow?.to ?? '',
    });
    setTimeWindowErrors({ from: null, to: null });
    setStepIndex(getInitialStepIndex({ exportToEdit, templateToEdit }));
    setSavedExport(null);
    setSelectedTemplateId('custom');
  // Intentionally not depending on `eligibility` to avoid resetting the form while the dialog is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, exportToEdit, initialOrgId, open, templateToEdit]);

  useEffect(() => {
    if (!selectedEligibility) {
      return;
    }

    if (!selectedEligibility.modes.some((mode) => mode === config.mode)) {
      form.setValue('config.mode', selectedEligibility.modes[0], {
        shouldDirty: true,
      });
    }
  }, [selectedEligibility, config.mode, form]);

  const statusOptions = useMemo(() => {
    const statuses = statusesQuery.data ?? [];
    if (config.mode === 'verwaltung') {
      return statuses.map((status) => ({
        label: status.verwalter_text,
        ids: [status.id],
        pseudo: null,
      }));
    }

    const grouped = new Map<string, string[]>();
    statuses.forEach((status) => {
      const current = grouped.get(status.helper_text) ?? [];
      current.push(status.id);
      grouped.set(status.helper_text, current);
    });

    return [
      { label: 'Eigene', ids: [], pseudo: 'own' },
      ...Array.from(grouped.entries()).map(([label, ids]) => ({
        label,
        ids,
        pseudo: null,
      })),
    ];
  }, [statusesQuery.data, config.mode]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        value: category.id,
        label: category.value,
      })),
    [categoriesQuery.data]
  );

  const applyTemplate = (template: CalendarExportTemplateChoice) => {
    form.setValue('name', template.name, { shouldDirty: true });
    form.setValue('config', template.config, { shouldDirty: true });
    setTimeWindowDraft({
      from: template.config.timeWindow?.from ?? '',
      to: template.config.timeWindow?.to ?? '',
    });
  };

  const requestClose = async (nextOpen: boolean) => {
    if (nextOpen) {
      props.onOpenChange(true);
      return;
    }

    if (form.formState.isDirty && !savedExport) {
      const result = await showDestructive(
        'Änderungen verwerfen?',
        'Möchten Sie den Dialog wirklich schließen? Nicht gespeicherte Änderungen gehen verloren.',
        { confirmText: 'Verwerfen', cancelText: 'Abbrechen' }
      );
      if (result !== 'success') {
        return;
      }
    }
    props.onOpenChange(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      step.id === 'filters' &&
      (timeWindowErrors.from ||
        timeWindowErrors.to ||
        (config.timeWindow &&
          ((timeWindowDraft.from && !timeWindowDraft.to) ||
            (!timeWindowDraft.from && timeWindowDraft.to))))
    ) {
      toast.error('Bitte geben Sie eine gültige Start- und Endzeit ein.');
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    await form.handleSubmit(save)();
  };

  const save = async (values: FormValues) => {
    if (props.mode === 'personal' && props.onSavePersonal) {
      try {
        await props.onSavePersonal({
          id: props.exportToEdit?.id,
          orgId: values.orgId,
          name: values.name,
          config: values.config,
        });
      } catch {
        return;
      }
      form.reset(values);
      props.onOpenChange(false);
      return;
    }

    if (props.mode === 'template' && props.onSaveTemplate) {
      try {
        await props.onSaveTemplate({
          id: props.templateToEdit?.id,
          orgId: values.orgId,
          name: values.name,
          description: values.description,
          config: values.config,
        });
      } catch {
        return;
      }
      form.reset(values);
      props.onOpenChange(false);
    }
  };

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('URL in Zwischenablage kopiert');
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const setStatusChecked = (
    option: { ids: string[]; pseudo: string | null },
    checked: boolean
  ) => {
    if (option.pseudo === 'own') {
      form.setValue('config.statusPseudo', checked ? ['own'] : [], {
        shouldDirty: true,
      });
      return;
    }

    const selectedIds = new Set(config.statusIds);
    option.ids.forEach((id) => {
      if (checked) {
        selectedIds.add(id);
      } else {
        selectedIds.delete(id);
      }
    });
    form.setValue('config.statusIds', Array.from(selectedIds), {
      shouldDirty: true,
    });
  };

  const selectOrg = (value: string) => {
    const nextEligibility = props.eligibility.find(
      (item) => item.organization.id === value
    );
    form.setValue('orgId', value, { shouldDirty: true });
    form.setValue(
      'config',
      getBlankCalendarExportConfig(nextEligibility?.modes[0] ?? 'helper'),
      { shouldDirty: true }
    );
    setTimeWindowDraft({ from: '', to: '' });
    form.setValue(
      'name',
      getCalendarExportNameAfterOrgChange({
        currentName: form.getValues('name'),
        isEditingExistingExport: Boolean(props.exportToEdit),
      }),
      { shouldDirty: true }
    );
    setSelectedTemplateId('custom');
  };

  const selectMode = (value: CalendarExportMode) => {
    form.setValue('config.mode', value, { shouldDirty: true });
    if (value === 'verwaltung') {
      form.setValue('config.statusPseudo', [], {
        shouldDirty: true,
      });
    }
    setSelectedTemplateId('custom');
  };

  const step = steps[stepIndex];

  return (
    <Dialog open={props.open} onOpenChange={requestClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            {steps.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  index <= stepIndex ? 'bg-primary' : 'bg-muted'
                )}
                aria-label={item.label}
              />
            ))}
          </div>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          {step.id === 'general' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="calendar-export-organization">
                  Organisation
                </Label>
                <Select value={orgId} onValueChange={selectOrg}>
                  <SelectTrigger id="calendar-export-organization">
                    <SelectValue placeholder="Organisation auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.eligibility.map((item) => (
                      <SelectItem
                        key={item.organization.id}
                        value={item.organization.id}
                      >
                        {item.organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {props.mode === 'personal' && (
                <div className="space-y-2">
                  <Label htmlFor="calendar-export-template">Vorlage</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(value) => {
                      setSelectedTemplateId(value);

                      if (value === 'custom') {
                        form.setValue(
                          'config',
                          getBlankCalendarExportConfig(config.mode),
                          { shouldDirty: true }
                        );
                        setTimeWindowDraft({ from: '', to: '' });
                        form.setValue('name', '', { shouldDirty: true });
                        return;
                      }

                      const template = templatesQuery.data?.find(
                        (item) => item.id === value
                      );
                      if (template) {
                        applyTemplate(template);
                      }
                    }}
                  >
                    <SelectTrigger id="calendar-export-template">
                      <SelectValue placeholder="Vorlage auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Keine Vorlage</SelectItem>
                      {templatesQuery.data?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} · {modeLabel(template.config.mode)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {availableModes.length > 1 && (
                <div className="space-y-2">
                  <Label>Ansicht</Label>
                  <div className="grid gap-2">
                    {availableModes.map((mode) => (
                      <label key={mode} className="flex items-center gap-2">
                        <Checkbox
                          checked={config.mode === mode}
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              selectMode(mode);
                            }
                          }}
                        />
                        <span>{modeLabel(mode)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step.id === 'filters' && (
            <div className="space-y-5">
              <div className="rounded-md border p-3 text-sm">
                {previewQuery.isLoading
                  ? 'Vorschau wird geladen...'
                  : formatCountLabel(
                      previewQuery.data?.count ?? 0,
                      selectedOrg?.einsatz_name_singular ?? 'Einsatz',
                      selectedOrg?.einsatz_name_plural ?? 'Einsätze'
                    )}
                {previewQuery.data?.trimmedBefore ? (
                  <p className="text-muted-foreground mt-1">
                    Ältere vergangene Ereignisse werden zur besseren
                    Synchronisation nicht exportiert.
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label>Kategorien</Label>
                {/* Keeps MultiSelect spacing aligned with other form controls. */}
                <div></div>
                <MultiSelect
                  options={categoryOptions}
                  value={config.categoryIds}
                  onValueChange={(categoryIds) =>
                    form.setValue('config.categoryIds', categoryIds, {
                      shouldDirty: true,
                    })
                  }
                  placeholder={
                    categoriesQuery.isLoading
                      ? 'Kategorien werden geladen...'
                      : 'Kategorien auswählen'
                  }
                  emptyState={
                    categoriesQuery.isLoading
                      ? 'Kategorien werden geladen...'
                      : 'Keine Kategorien vorhanden.'
                  }
                  maxCount={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        config.statusIds.length === 0 &&
                        config.statusPseudo.length === 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          form.setValue('config.statusIds', [], {
                            shouldDirty: true,
                          });
                          form.setValue('config.statusPseudo', [], {
                            shouldDirty: true,
                          });
                        }
                      }}
                    />
                    <span>Alle</span>
                  </label>
                  {statusOptions.map((option) => {
                    const checked =
                      option.pseudo === 'own'
                        ? config.statusPseudo.includes('own')
                        : option.ids.every((id) =>
                            config.statusIds.includes(id)
                          );
                    return (
                      <label
                        key={`${option.label}-${option.ids.join('-')}`}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setStatusChecked(option, nextChecked === true)
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div>Fortgeschritten</div>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.timeWindow !== null}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        const from = timeWindowDraft.from || '09:00';
                        const to = timeWindowDraft.to || '10:00';
                        setTimeWindowDraft({ from, to });
                        form.setValue(
                          'config.timeWindow',
                          { from, to },
                          {
                            shouldDirty: true,
                          }
                        );
                        return;
                      }

                      setTimeWindowDraft({ from: '', to: '' });
                      setTimeWindowErrors({ from: null, to: null });
                      form.setValue('config.timeWindow', null, {
                        shouldDirty: true,
                      });
                    }}
                  />
                  <span>Nach Uhrzeit filtern</span>
                </label>
                {config.timeWindow ? (
                  <div className="grid grid-cols-2 gap-3">
                    <TimeTextInput
                      id="calendar-export-time-window-from"
                      invalidMessage="Bitte geben Sie eine gültige Startzeit ein, z. B. 09:30."
                      value={timeWindowDraft.from}
                      onValidationChange={(error) =>
                        setTimeWindowErrors((current) => ({
                          ...current,
                          from: error,
                        }))
                      }
                      onValueChange={(from) => {
                        const to = timeWindowDraft.to;
                        setTimeWindowDraft({ from, to });
                        form.setValue(
                          'config.timeWindow',
                          { from, to },
                          {
                            shouldDirty: true,
                          }
                        );
                      }}
                    />
                    <TimeTextInput
                      id="calendar-export-time-window-to"
                      invalidMessage="Bitte geben Sie eine gültige Endzeit ein, z. B. 12:20."
                      value={timeWindowDraft.to}
                      onValidationChange={(error) =>
                        setTimeWindowErrors((current) => ({
                          ...current,
                          to: error,
                        }))
                      }
                      onValueChange={(to) => {
                        const from = timeWindowDraft.from;
                        setTimeWindowDraft({ from, to });
                        form.setValue(
                          'config.timeWindow',
                          { from, to },
                          {
                            shouldDirty: true,
                          }
                        );
                      }}
                    />
                  </div>
                ) : null}
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.includeAllDay}
                    onCheckedChange={(checked) =>
                      form.setValue('config.includeAllDay', checked === true, {
                        shouldDirty: true,
                      })
                    }
                  />
                  <span>Ganztägige Ereignisse einschließen</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.futureOnly}
                    onCheckedChange={(checked) =>
                      form.setValue('config.futureOnly', checked === true, {
                        shouldDirty: true,
                      })
                    }
                  />
                  <span>Nur zukünftige Ereignisse</span>
                </label>
              </div>
            </div>
          )}

          {step.id === 'preview' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar-export-name">
                  Name Kalenderexport
                </Label>

                <Input id="calendar-export-name" {...form.register('name')} />
                {form.formState.errors.name ? (
                  <p className="text-destructive text-sm">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              {props.mode === 'template' && (
                <div className="space-y-2">
                  <Label htmlFor="calendar-export-description">
                    Beschreibung
                  </Label>
                  <Textarea
                    id="calendar-export-description"
                    {...form.register('description')}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label>Titel zusammensetzen aus</Label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.titleAdditions.assignedHelperNames}
                    disabled={
                      config.titleAdditions.assignedHelperNames &&
                      titlePartCount === 1
                    }
                    onCheckedChange={(checked) =>
                      form.setValue(
                        'config.titleAdditions.assignedHelperNames',
                        checked === true,
                        { shouldDirty: true }
                      )
                    }
                  />
                  <span>Eingeteilte Personen</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.titleAdditions.eventTitle}
                    disabled={
                      config.titleAdditions.eventTitle && titlePartCount === 1
                    }
                    onCheckedChange={(checked) =>
                      form.setValue(
                        'config.titleAdditions.eventTitle',
                        checked === true,
                        { shouldDirty: true }
                      )
                    }
                  />
                  <span>Einsatztitel</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.titleAdditions.categories}
                    disabled={
                      config.titleAdditions.categories && titlePartCount === 1
                    }
                    onCheckedChange={(checked) =>
                      form.setValue(
                        'config.titleAdditions.categories',
                        checked === true,
                        { shouldDirty: true }
                      )
                    }
                  />
                  <span>Kategorien</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={config.titleAdditions.helperCount}
                    disabled={
                      config.titleAdditions.helperCount && titlePartCount === 1
                    }
                    onCheckedChange={(checked) =>
                      form.setValue(
                        'config.titleAdditions.helperCount',
                        checked === true,
                        { shouldDirty: true }
                      )
                    }
                  />
                  <span>Eingetragene/benötigte Helfer:innen</span>
                </label>
              </div>

              <div className="rounded-md border px-3 py-2">
                {previewQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm">
                    Vorschau wird geladen...
                  </p>
                ) : previewQuery.data?.previewEvents.length ? (
                  <div className="divide-y">
                    {previewQuery.data.previewEvents.map((event) => {
                      const durationTag = getPreviewDurationTag(event);

                      return (
                        <div
                          key={event.id}
                          className="relative py-2 pr-24 first:pt-0 last:pb-0"
                        >
                          <p className="font-medium">{event.title}</p>
                          <p className="text-muted-foreground text-sm">
                            {formatPreviewDate(event)}
                          </p>
                          {durationTag ? (
                            <Badge
                              variant="secondary"
                              className="absolute top-2 right-0"
                            >
                              {durationTag}
                            </Badge>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Es gibt kein Ereignis, das mit den aktuellen Filtern
                    exportiert wird.
                  </p>
                )}
              </div>

              <p className="text-muted-foreground text-sm">
                {selectedOrg?.name} · {modeLabel(config.mode)}
              </p>
              {savedExport ? (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="font-medium">Kalender-Link ist bereit</p>
                  <p className="text-muted-foreground font-mono text-xs break-all">
                    {savedExport.webcalUrl}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => copyUrl(savedExport.webcalUrl)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Kopieren
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <a href={savedExport.webcalUrl}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        In Kalender öffnen
                      </a>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                stepIndex === 0
                  ? requestClose(false)
                  : setStepIndex((current) => current - 1)
              }
            >
              {stepIndex === 0 ? 'Abbrechen' : 'Zurück'}
            </Button>
            {savedExport ? (
              <Button type="button" onClick={() => props.onOpenChange(false)}>
                Schließen
              </Button>
            ) : (
              <Button type="submit">
                {stepIndex === steps.length - 1 ? 'Speichern' : 'Weiter'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
