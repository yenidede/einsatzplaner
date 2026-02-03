'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Type, Hash, Link2, Plus, Trash, Pause, Play } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getFieldTypeDefinition,
  type FieldTypeKey,
} from '@/features/user_properties/field-type-definitions';
import { PageHeader } from '@/components/settings/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  StandardFieldsList,
  STANDARD_FIELDS,
  type StandardFieldKey,
} from './StandardFieldsList';
import { TemplateFieldListItem } from './TemplateFieldListItem';
import {
  templateFormSchema,
  type TemplateFormValues,
  type TemplateFormInputValues,
} from './template-form-schema';
import { FieldTypeSelector } from '@/features/user_properties/components/FieldTypeSelector';
import { VORLAGE_SELECTABLE_FIELD_TYPES } from '@/features/user_properties/field-type-definitions';
import { PropertyConfiguration } from '@/features/user_properties/components/PropertyConfiguration';
import type {
  PropertyConfig,
  FieldType,
} from '@/features/user_properties/types';
import { INITIAL_CONFIG } from '@/features/user_properties/types';
import {
  useTemplate,
  useTemplateIcons,
} from '../../features/template/hooks/use-template-queries';
import { useTemplateMutations } from '../../features/template/hooks/useTemplateMutations';
import { useOrganization } from '@/features/organization/hooks/use-organization-queries';
import { useCategoriesByOrgIds } from '@/features/category/hooks/useCategories';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import TooltipCustom from '../tooltip-custom';

/** Format a Date (time-only from DB) to "HH:mm" for input[type="time"]. */
function formatTimeForInput(d: Date | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  const h = date.getHours();
  const m = date.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Parse "HH:mm" string to a Date (fixed calendar day, local time) for Prisma Time. */
function parseTimeFromInput(s: string): Date | null {
  if (!s || !/^\d{1,2}:\d{2}$/.test(s.trim())) return null;
  const [h, m] = s.trim().split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return new Date(2000, 0, 1, h, m);
}

interface TemplateFormProps {
  /** Required for create; in edit mode derived from loaded template if omitted */
  orgId?: string;
  templateId?: string | null;
  /** Optional for edit – derived from template.org_id when template is loaded */
  backHref?: string;
}

export function TemplateForm({
  orgId: orgIdProp,
  templateId,
  backHref: backHrefProp,
}: TemplateFormProps) {
  const router = useRouter();
  const isEdit = !!templateId;
  const {
    createMutation,
    updateMutation,
    addTemplateFieldMutation,
    updateTemplateFieldMutation,
    deleteTemplateFieldMutation,
    setDefaultCategoriesMutation,
    deleteTemplateMutation,
    isSaving,
  } = useTemplateMutations();
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const { data: template, isLoading: templateLoading } = useTemplate(
    isEdit ? templateId : null
  );
  const effectiveOrgId =
    isEdit && template ? (template.org_id ?? undefined) : orgIdProp;
  const { data: icons = [] } = useTemplateIcons();
  const { data: org } = useOrganization(effectiveOrgId);
  const { data: orgCategories = [] } = useCategoriesByOrgIds(
    effectiveOrgId ? [effectiveOrgId] : []
  );

  const form = useForm<TemplateFormInputValues, unknown, TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      icon_id: '',
      description: '',
    },
  });

  const { register, control, handleSubmit, formState, watch, setValue, reset } =
    form;
  const { errors } = formState;

  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [customFieldStep, setCustomFieldStep] = useState<
    'typeSelection' | 'configuration'
  >('typeSelection');
  const [customFieldConfig, setCustomFieldConfig] =
    useState<PropertyConfig>(INITIAL_CONFIG);
  /** When set, dialog is in edit mode for this field id */
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  /** When set, dialog is open for editing this standard field's default/placeholder */
  const [editingStandardFieldKey, setEditingStandardFieldKey] =
    useState<StandardFieldKey | null>(null);
  const [standardFieldDefaultValue, setStandardFieldDefaultValue] =
    useState('');
  const [standardFieldPlaceholderValue, setStandardFieldPlaceholderValue] =
    useState('');
  /** Selected category IDs for Kategorie standard field (default categories, no placeholder). */
  const [selectedDefaultCategoryIds, setSelectedDefaultCategoryIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (template) {
      reset({
        name: template.name ?? '',
        icon_id: template.icon_id ?? '',
        description: template.description ?? '',
      });
    }
  }, [template, reset]);

  useEffect(() => {
    if (icons.length > 0 && !watch('icon_id')) {
      setValue('icon_id', icons[0].id, { shouldValidate: true });
    }
  }, [icons, setValue, watch]);

  const onSubmit = useCallback(
    (data: TemplateFormValues) => {
      const iconId = data.icon_id || (icons[0]?.id ?? '');
      if (isEdit && templateId) {
        updateMutation.mutate({
          templateId,
          name: data.name || null,
          icon_id: iconId || undefined,
          description: data.description ?? null,
        });
      } else if (effectiveOrgId) {
        createMutation.mutate({
          org_id: effectiveOrgId,
          name: data.name || '',
          icon_id: iconId,
          description: data.description ?? null,
        });
      }
    },
    [isEdit, templateId, effectiveOrgId, icons, createMutation, updateMutation]
  );

  const computedBackHref =
    isEdit && template?.org_id
      ? `/settings/org/${template.org_id}#vorlagen`
      : (backHrefProp ?? '/settings');

  const handleCancel = useCallback(() => {
    router.push(computedBackHref);
  }, [router, computedBackHref]);

  const handleDelete = useCallback(async () => {
    const result = await showDialog({
      title: 'Vorlage löschen?',
      description:
        'Diese Vorlage wird unwiderruflich gelöscht. Bestehende Einsätze bleiben unverändert.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
    });
    if (result === 'success' && templateId) {
      deleteTemplateMutation.mutate({
        templateId,
        redirectTo: computedBackHref,
      });
    }
  }, [showDialog, templateId, computedBackHref, deleteTemplateMutation]);

  const handlePause = useCallback(async () => {
    const isPaused = template?.is_paused ?? false;
    const result = await showDialog({
      title: isPaused ? 'Vorlage reaktivieren?' : 'Vorlage pausieren?',
      description: isPaused
        ? 'Die Vorlage wird wieder für neue Einsätze verfügbar gemacht.'
        : 'Pausierte Vorlagen können nicht für neue Einsätze verwendet werden. Bestehende Einsätze bleiben unverändert.',
      confirmText: isPaused ? 'Reaktivieren' : 'Pausieren',
      cancelText: 'Abbrechen',
    });
    if (result === 'success' && templateId) {
      updateMutation.mutate({ templateId, is_paused: !isPaused });
    }
  }, [showDialog, template?.is_paused, templateId, updateMutation]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        form.handleSubmit(onSubmit)();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [form, onSubmit, handleCancel]);

  const formName = watch('name');
  const pageTitle = isEdit
    ? template
      ? `'${formName.trim()}' bearbeiten`
      : 'Vorlage erstellen'
    : `Erstelle Vorlage ${formName?.trim() ? `'${formName.trim()}'` : ''}`;

  const existingTemplateFieldNames =
    template?.template_field
      ?.map((tf) => tf.field?.name ?? '')
      .filter(Boolean)
      .map((n) => String(n).toLowerCase()) ?? [];

  /** Names of other fields (for edit mode: exclude the field being edited so same name is allowed) */
  const editingFieldName =
    editingFieldId &&
    template?.template_field?.find((tf) => tf.field?.id === editingFieldId)
      ?.field?.name;
  const existingTemplateFieldNamesForDialog = editingFieldName
    ? existingTemplateFieldNames.filter(
        (n) => n !== String(editingFieldName).toLowerCase()
      )
    : existingTemplateFieldNames;

  type TemplateFieldItem = NonNullable<
    NonNullable<typeof template>['template_field']
  >[number];
  const templateFieldToPropertyConfig = useCallback(
    (tf: TemplateFieldItem): PropertyConfig | null => {
      const f = tf?.field;
      if (!f) return null;
      const datatype = f.type?.datatype;
      const isValidFieldType = (v: unknown): v is FieldType =>
        typeof v === 'string' &&
        ['text', 'number', 'boolean', 'select'].includes(v);
      if (!datatype || !isValidFieldType(datatype)) return null;
      return {
        name: f.name ?? '',
        description: '',
        fieldType: datatype,
        placeholder: f.placeholder ?? '',
        maxLength: f.max != null ? f.max : undefined,
        isMultiline: f.is_multiline ?? false,
        minValue: f.min != null ? f.min : undefined,
        maxValue: f.max != null ? f.max : undefined,
        isDecimal: false,
        trueLabel: 'Ja',
        falseLabel: 'Nein',
        booleanDefaultValue: null,
        options: f.allowed_values ?? [],
        defaultOption: f.default_value ?? undefined,
        isRequired: f.is_required,
        defaultValue: f.default_value ?? '',
      };
    },
    []
  );

  const handleCustomFieldTypeSelect = (type: PropertyConfig['fieldType']) => {
    if (!type) return;
    setCustomFieldConfig((prev) => ({ ...prev, fieldType: type }));
    setCustomFieldStep('configuration');
  };

  const handleCustomFieldConfigChange = (updates: Partial<PropertyConfig>) => {
    setCustomFieldConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleOpenCreateField = useCallback(() => {
    setEditingFieldId(null);
    setCustomFieldConfig(INITIAL_CONFIG);
    setCustomFieldStep('typeSelection');
    setCustomFieldDialogOpen(true);
  }, []);

  const handleOpenEditField = useCallback(
    (tf: TemplateFieldItem) => {
      const config = templateFieldToPropertyConfig(tf);
      if (!config) return;
      setCustomFieldConfig(config);
      setEditingFieldId(tf.field?.id ?? null);
      setCustomFieldStep('configuration');
      setCustomFieldDialogOpen(true);
    },
    [templateFieldToPropertyConfig, template?.template_field]
  );

  const handleCustomFieldSave = useCallback(() => {
    if (!templateId || !customFieldConfig.fieldType) return;
    if (editingFieldId) {
      updateTemplateFieldMutation.mutate(
        {
          templateId,
          fieldId: editingFieldId,
          config: customFieldConfig,
        },
        {
          onSuccess: () => {
            setCustomFieldDialogOpen(false);
            setCustomFieldStep('typeSelection');
            setCustomFieldConfig(INITIAL_CONFIG);
            setEditingFieldId(null);
          },
        }
      );
    } else {
      addTemplateFieldMutation.mutate(
        { templateId, config: customFieldConfig },
        {
          onSuccess: () => {
            setCustomFieldDialogOpen(false);
            setCustomFieldStep('typeSelection');
            setCustomFieldConfig(INITIAL_CONFIG);
          },
        }
      );
    }
  }, [
    templateId,
    customFieldConfig,
    editingFieldId,
    addTemplateFieldMutation,
    updateTemplateFieldMutation,
  ]);

  const handleCustomFieldDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setCustomFieldDialogOpen(false);
      setCustomFieldStep('typeSelection');
      setCustomFieldConfig(INITIAL_CONFIG);
      setEditingFieldId(null);
    }
  }, []);

  useEffect(() => {
    if (editingStandardFieldKey && template) {
      switch (editingStandardFieldKey) {
        case 'name':
          setStandardFieldDefaultValue(
            String(
              (template as { einsatzname_default?: string | null })
                .einsatzname_default ?? ''
            )
          );
          setStandardFieldPlaceholderValue('');
          break;
        case 'kategorie': {
          const ids =
            template.template_to_category
              ?.map((t) => t.category_id)
              .filter((id): id is string => id != null) ?? [];
          setSelectedDefaultCategoryIds(ids);
          setStandardFieldDefaultValue('');
          setStandardFieldPlaceholderValue('');
          break;
        }
        case 'time_start':
          setStandardFieldDefaultValue(
            formatTimeForInput(template.time_start_default)
          );
          setStandardFieldPlaceholderValue(
            formatTimeForInput(template.time_start_placeholder)
          );
          break;
        case 'time_end':
          setStandardFieldDefaultValue(
            formatTimeForInput(template.time_end_default)
          );
          setStandardFieldPlaceholderValue(
            formatTimeForInput(template.time_end_placeholder)
          );
          break;
        case 'participant_count':
          setStandardFieldDefaultValue(
            String(template.participant_count_default ?? '')
          );
          setStandardFieldPlaceholderValue(
            String(template.participant_count_placeholder ?? '')
          );
          break;
        case 'price_person':
          setStandardFieldDefaultValue(
            String(template.price_person_default ?? '')
          );
          setStandardFieldPlaceholderValue(
            String(template.price_person_placeholder ?? '')
          );
          break;
        case 'helpers_needed':
          setStandardFieldDefaultValue(
            String(template.helpers_needed_default ?? '')
          );
          setStandardFieldPlaceholderValue(
            String(template.helpers_needed_placeholder ?? '')
          );
          break;
        case 'all_day':
          setStandardFieldDefaultValue(
            template.all_day_default === true ? 'true' : 'false'
          );
          setStandardFieldPlaceholderValue('');
          break;
      }
    }
  }, [editingStandardFieldKey, template]);

  const handleOpenStandardField = useCallback((key: StandardFieldKey) => {
    setEditingStandardFieldKey(key);
  }, []);

  const handleSaveStandardField = useCallback(() => {
    if (!templateId || !editingStandardFieldKey) return;
    const payload: Record<
      string,
      number | null | boolean | string | Date | undefined
    > = {};
    const defaultNum = (v: string) =>
      v === '' || v === undefined ? null : Number(v);
    const defaultFloat = (v: string) =>
      v === '' || v === undefined ? null : Number(v);
    const defaultStr = (v: string) =>
      v === '' || v === undefined ? null : v.trim() || null;
    switch (editingStandardFieldKey) {
      case 'name':
        payload.einsatzname_default = defaultStr(standardFieldDefaultValue);
        break;
      case 'kategorie':
        setDefaultCategoriesMutation.mutate(
          { templateId, categoryIds: selectedDefaultCategoryIds },
          {
            onSuccess: () => {
              setEditingStandardFieldKey(null);
            },
          }
        );
        return;
      case 'time_start':
        payload.time_start_default = parseTimeFromInput(standardFieldDefaultValue);
        payload.time_start_placeholder = parseTimeFromInput(standardFieldPlaceholderValue);
        break;
      case 'time_end':
        payload.time_end_default = parseTimeFromInput(standardFieldDefaultValue);
        payload.time_end_placeholder = parseTimeFromInput(standardFieldPlaceholderValue);
        break;
      case 'participant_count':
        payload.participant_count_default = defaultNum(
          standardFieldDefaultValue
        );
        payload.participant_count_placeholder = defaultNum(
          standardFieldPlaceholderValue
        );
        break;
      case 'price_person':
        payload.price_person_default = defaultFloat(standardFieldDefaultValue);
        payload.price_person_placeholder = defaultFloat(
          standardFieldPlaceholderValue
        );
        break;
      case 'helpers_needed':
        payload.helpers_needed_default = defaultNum(standardFieldDefaultValue);
        payload.helpers_needed_placeholder = defaultNum(
          standardFieldPlaceholderValue
        );
        break;
      case 'all_day':
        payload.all_day_default =
          standardFieldDefaultValue === 'true'
            ? true
            : standardFieldDefaultValue === 'false'
              ? false
              : null;
        break;
    }
    updateMutation.mutate(
      { templateId, ...payload },
      {
        onSuccess: () => {
          setEditingStandardFieldKey(null);
        },
      }
    );
  }, [
    templateId,
    editingStandardFieldKey,
    standardFieldDefaultValue,
    standardFieldPlaceholderValue,
    selectedDefaultCategoryIds,
    updateMutation,
    setDefaultCategoriesMutation,
  ]);

  const handleStandardFieldDialogClose = useCallback((open: boolean) => {
    if (!open) setEditingStandardFieldKey(null);
  }, []);

  const editingStandardFieldName =
    editingStandardFieldKey &&
    STANDARD_FIELDS.find((f) => f.standardFieldKey === editingStandardFieldKey)
      ?.name;

  const handleDeleteField = useCallback(
    async (fieldId: string) => {
      const tf = template?.template_field?.find((t) => t.field?.id === fieldId);
      const name = tf?.field?.name ?? 'Feld';
      const result = await showDialog({
        title: 'Feld löschen?',
        description: `Möchten Sie das Feld "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        variant: 'destructive',
      });
      if (result === 'success' && templateId) {
        deleteTemplateFieldMutation.mutate({ templateId, fieldId });
      }
    },
    [
      template?.template_field,
      templateId,
      showDialog,
      deleteTemplateFieldMutation,
    ]
  );

  const maxParticipantsPerHelper = org?.max_participants_per_helper ?? 20;

  const header = (
    <PageHeader
      title={pageTitle}
      onSave={() => form.handleSubmit(onSubmit)()}
      isSaving={isSaving}
      onCancel={handleCancel}
    />
  );

  const loadingContent = (
    <div className="text-muted-foreground py-8 text-center text-sm">
      Lade Vorlage…
    </div>
  );

  if (isEdit && templateLoading) {
    return (
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        {loadingContent}
      </div>
    );
  }

  if (isEdit && !templateLoading && !template) {
    return (
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground py-8 text-center text-sm">
          Vorlage nicht gefunden.
        </p>
      </div>
    );
  }

  const formContent = (
    <>
      {template?.is_paused ? (
        <Card className="bg-red-200">
          <CardHeader>
            <CardTitle>Vorlage is pausiert</CardTitle>
            <CardDescription>
              Die Vorlage ist pausiert. Sie kann nicht für neue Einsätze
              verwendet werden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handlePause}>
              {template?.is_paused ? 'Reaktivieren' : 'Pausieren'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          {/* Template info */}
          <Card>
            <CardHeader>
              <CardTitle>Template-Informationen</CardTitle>
              <CardDescription>
                Bezeichnung und Icon der Vorlage.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">
                  Template Bezeichnung{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="template-name"
                  placeholder="Einsatzname"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-icon">
                  Template Icon <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="icon_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || (icons[0]?.id ?? '')}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="template-icon">
                        <SelectValue placeholder="Icon auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {icons.map((icon, index) => (
                          <SelectItem key={icon.id} value={icon.id}>
                            <span className="flex items-center gap-2">
                              {icon.icon_url?.trim() ? (
                                <Image
                                  src={icon.icon_url.trim()}
                                  alt=""
                                  width={18}
                                  height={18}
                                  unoptimized
                                />
                              ) : (
                                <span className="bg-muted h-[18px] w-[18px] rounded" />
                              )}
                              Icon {index + 1}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.icon_id && (
                  <p className="text-destructive text-sm">
                    {errors.icon_id.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="template-description">
                  Beschreibung (optional)
                </Label>
                <Input
                  id="template-description"
                  placeholder="Kurze Beschreibung der Vorlage"
                  {...register('description')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Standard fields */}
          <Card>
            <CardHeader>
              <CardTitle>Standardfelder</CardTitle>
              <CardDescription>
                Von uns vordefinierte Felder für jeden Einsatz. Diese können
                nicht bearbeitet werden. Können durch eigene Felder (siehe
                unten) ergänzt werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StandardFieldsList
                onOpenStandardField={
                  templateId && template ? handleOpenStandardField : undefined
                }
              />
            </CardContent>
          </Card>

          {/* Standard field edit dialog: default + placeholder */}
          <Dialog
            open={editingStandardFieldKey != null}
            onOpenChange={handleStandardFieldDialogClose}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Standardfeld bearbeiten: {editingStandardFieldName ?? ''}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {editingStandardFieldKey === 'kategorie' && (
                  <div className="space-y-2">
                    <Label>Standard-Kategorien (optional)</Label>
                    <p className="text-muted-foreground text-sm">
                      Kategorien, die bei neuen Einsätzen mit dieser Vorlage
                      vorausgewählt werden.
                    </p>
                    <div className="border-muted max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                      {orgCategories.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Keine Kategorien für diese Organisation angelegt.
                        </p>
                      ) : (
                        orgCategories.map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`kategorie-${cat.id}`}
                              checked={selectedDefaultCategoryIds.includes(
                                cat.id
                              )}
                              onCheckedChange={(checked) => {
                                setSelectedDefaultCategoryIds((prev) =>
                                  checked
                                    ? [...prev, cat.id]
                                    : prev.filter((id) => id !== cat.id)
                                );
                              }}
                            />
                            <Label
                              htmlFor={`kategorie-${cat.id}`}
                              className="font-normal"
                            >
                              {cat.value}
                              {cat.abbreviation ? ` (${cat.abbreviation})` : ''}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {editingStandardFieldKey === 'name' && (
                  <div className="space-y-2">
                    <Label htmlFor="standard-field-default">
                      Standardwert (optional)
                    </Label>
                    <Input
                      id="standard-field-default"
                      type="text"
                      value={standardFieldDefaultValue}
                      onChange={(e) =>
                        setStandardFieldDefaultValue(e.target.value)
                      }
                      placeholder="Leer = kein Standard"
                    />
                  </div>
                )}
                {editingStandardFieldKey !== 'all_day' &&
                  editingStandardFieldKey !== 'kategorie' &&
                  editingStandardFieldKey !== 'name' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="standard-field-default">
                          Standardwert (optional)
                        </Label>
                        <Input
                          id="standard-field-default"
                          type={
                            editingStandardFieldKey === 'time_start' ||
                            editingStandardFieldKey === 'time_end'
                              ? 'time'
                              : editingStandardFieldKey === 'price_person' ||
                                  editingStandardFieldKey === 'participant_count' ||
                                  editingStandardFieldKey === 'helpers_needed'
                                ? 'number'
                                : 'text'
                          }
                          step={
                            editingStandardFieldKey === 'price_person'
                              ? '0.01'
                              : editingStandardFieldKey === 'participant_count' ||
                                  editingStandardFieldKey === 'helpers_needed'
                                ? '1'
                                : undefined
                          }
                          value={standardFieldDefaultValue}
                          onChange={(e) =>
                            setStandardFieldDefaultValue(e.target.value)
                          }
                          placeholder="Leer = kein Standard"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="standard-field-placeholder">
                          Platzhalter (optional)
                        </Label>
                        <Input
                          id="standard-field-placeholder"
                          type={
                            editingStandardFieldKey === 'time_start' ||
                            editingStandardFieldKey === 'time_end'
                              ? 'time'
                              : editingStandardFieldKey === 'price_person' ||
                                  editingStandardFieldKey === 'participant_count' ||
                                  editingStandardFieldKey === 'helpers_needed'
                                ? 'number'
                                : 'text'
                          }
                          step={
                            editingStandardFieldKey === 'price_person'
                              ? '0.01'
                              : editingStandardFieldKey === 'participant_count' ||
                                  editingStandardFieldKey === 'helpers_needed'
                                ? '1'
                                : undefined
                          }
                          value={standardFieldPlaceholderValue}
                          onChange={(e) =>
                            setStandardFieldPlaceholderValue(e.target.value)
                          }
                          placeholder="Leer = kein Platzhalter"
                        />
                      </div>
                    </>
                  )}
                {editingStandardFieldKey === 'all_day' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="standard-field-all-day"
                      checked={standardFieldDefaultValue === 'true'}
                      onCheckedChange={(checked) =>
                        setStandardFieldDefaultValue(
                          checked === true ? 'true' : 'false'
                        )
                      }
                    />
                    <Label htmlFor="standard-field-all-day">
                      Ganztägig als Standard
                    </Label>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => handleStandardFieldDialogClose(false)}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleSaveStandardField} disabled={isSaving}>
                  {isSaving ? 'Speichert…' : 'Speichern'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Custom fields */}
          <Card>
            <CardHeader>
              <CardTitle>Eigene Felder</CardTitle>
              <CardDescription>
                Wähle einen Feldtyp aus. Eigene Felder ergänzen die von uns
                erstellten Standardfelder.
              </CardDescription>
              <CardAction>
                <Button
                  variant="default"
                  onClick={handleOpenCreateField}
                  disabled={!templateId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {!!templateId
                    ? 'Eigenes Feld hinzufügen'
                    : 'Zuerst Vorlage speichern (⌘S)'}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {!template?.template_field?.length ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Image
                    src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/undraw_instant-analysis_vm8x%201.svg"
                    alt="Eigene Felder"
                    width={245}
                    height={210}
                    unoptimized
                  />
                  <Button
                    variant="outline"
                    className="w-full max-w-xs"
                    onClick={handleOpenCreateField}
                    disabled={!templateId}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {!!templateId
                      ? 'Eigenes Feld hinzufügen'
                      : 'Zuerst Vorlage speichern (⌘S)'}
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {template.template_field.map((tf) => {
                    const datatype = tf.field?.type?.datatype ?? 'text';
                    const fieldDef = getFieldTypeDefinition(
                      datatype as FieldTypeKey
                    );
                    const fieldId = tf.field?.id ?? '';
                    return (
                      <TemplateFieldListItem
                        key={fieldId}
                        name={tf.field?.name ?? 'Feld'}
                        typeLabel={tf.field?.type?.datatype ?? '—'}
                        icon={fieldDef?.Icon ?? Type}
                        isPflichtfeld={tf.field?.is_required}
                        onOpen={() => handleOpenEditField(tf)}
                        onDelete={() => handleDeleteField(fieldId)}
                        deleteDisabled={isSaving}
                      />
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Custom field dialog: type selection + configuration (same flow as UserProperties) */}
          <Dialog
            open={customFieldDialogOpen}
            onOpenChange={handleCustomFieldDialogClose}
          >
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingFieldId
                    ? 'Eigenes Feld bearbeiten'
                    : 'Eigenes Feld erstellen'}
                </DialogTitle>
              </DialogHeader>
              {customFieldStep === 'typeSelection' ? (
                <FieldTypeSelector
                  onSelectType={handleCustomFieldTypeSelect}
                  onBack={() => handleCustomFieldDialogClose(false)}
                  enabledFieldTypes={VORLAGE_SELECTABLE_FIELD_TYPES}
                />
              ) : (
                <PropertyConfiguration
                  config={customFieldConfig}
                  onConfigChange={handleCustomFieldConfigChange}
                  onSave={handleCustomFieldSave}
                  onCancel={() =>
                    editingFieldId
                      ? handleCustomFieldDialogClose(false)
                      : setCustomFieldStep('typeSelection')
                  }
                  existingPropertyNames={existingTemplateFieldNamesForDialog}
                  existingUserCount={0}
                  context="vorlage"
                  title="Feld konfigurieren"
                  nameLabel="Label *"
                  saveButtonLabel={
                    editingFieldId ? 'Änderungen speichern' : 'Feld Speichern'
                  }
                  saveDisabled={
                    addTemplateFieldMutation.isPending ||
                    updateTemplateFieldMutation.isPending
                  }
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Verifications */}
          <Card>
            <CardHeader>
              <CardTitle>Überprüfungen</CardTitle>
              <CardDescription>
                Regeln für Teilnehmer und Personeneigenschaften
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-2">
                <TemplateFieldListItem
                  name={
                    <>
                      Anzahl Teilnehmer:innen maximal{' '}
                      <span className="text-primary font-semibold">
                        {maxParticipantsPerHelper}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        pro Helfer:in
                      </span>
                    </>
                  }
                  typeLabel="Feld"
                  icon={Hash}
                />
                <TemplateFieldListItem
                  name={
                    <>
                      Person hat Schlüssel mindestens{' '}
                      <span className="text-primary font-semibold">1</span>
                    </>
                  }
                  typeLabel="Personeneigenschaft"
                  icon={Link2}
                />
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-40 flex items-center justify-between gap-2 border-t py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isEdit && (
            <>
              {/* <TooltipCustom text="Vorlage löschen">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  <Trash className="size-4" />
                </Button>
              </TooltipCustom> */}
              <TooltipCustom
                text={
                  template?.is_paused
                    ? 'Vorlage reaktivieren'
                    : 'Vorlage pausieren'
                }
              >
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handlePause}
                  disabled={isSaving}
                >
                  {template?.is_paused ? (
                    <Play className="size-4" />
                  ) : (
                    <Pause className="size-4" />
                  )}
                </Button>
              </TooltipCustom>
            </>
          )}
        </div>
        <div>
          <Button variant="ghost" onClick={handleCancel}>
            Schließen (ESC)
          </Button>
          <Button
            onClick={() => form.handleSubmit(onSubmit)()}
            disabled={isSaving}
          >
            {isSaving ? 'Speichert…' : 'Speichern'}
          </Button>
        </div>
      </footer>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {header}
        {formContent}
      </div>
      {AlertDialogComponent}
    </div>
  );
}
