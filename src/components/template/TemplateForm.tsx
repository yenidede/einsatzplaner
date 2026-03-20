'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Type, Hash, Plus, Pause, Play, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getFieldTypeDefinition,
  isFieldTypeKey,
} from '@/features/user_properties/field-type-definitions';
import { PageHeader } from '@/components/settings/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
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
import { ExistingTemplateFieldSelector } from './ExistingTemplateFieldSelector';
import { TemplateFieldReuseSuggestions } from './TemplateFieldReuseSuggestions';
import {
  templateFormSchema,
  type TemplateFormValues,
  type TemplateFormInputValues,
} from './template-form-schema';
import { FieldTypeSelector } from '@/features/user_properties/components/FieldTypeSelector';
import { VORLAGE_SELECTABLE_FIELD_TYPES } from '@/features/user_properties/field-type-definitions';
import { PropertyConfiguration } from '@/features/user_properties/components/PropertyConfiguration';
import type { PropertyConfig } from '@/features/user_properties/types';
import { INITIAL_CONFIG } from '@/features/user_properties/types';
import { fieldToPropertyConfig } from '@/features/user_properties/utils/field-to-property-config';
import {
  useTemplate,
  useTemplateFieldReuseCandidates,
  useTemplateIcons,
} from '../../features/template/hooks/use-template-queries';
import { useTemplateMutations } from '../../features/template/hooks/useTemplateMutations';
import { useUserProperties } from '@/features/user_properties/hooks/use-user-property-queries';
import { MultiSelect } from '@/components/form/multi-select';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/features/organization/hooks/use-organization-queries';
import { useCategories } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import TooltipCustom from '../tooltip-custom';
import type { TemplateFieldReuseCandidate } from '@/features/template/template-dal';

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

function normalizeComparisonValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('de-AT')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getNameSimilarityScore(source: string, target: string): number {
  if (!source || !target) return 0;
  if (source === target) return 1;
  if (source.includes(target) || target.includes(source)) return 0.9;

  const sourceTokens = new Set(source.split(' ').filter(Boolean));
  const targetTokens = new Set(target.split(' ').filter(Boolean));
  if (sourceTokens.size === 0 || targetTokens.size === 0) return 0;

  const overlappingTokens = Array.from(sourceTokens).filter((token) =>
    targetTokens.has(token)
  ).length;
  const tokenScore =
    overlappingTokens / Math.max(sourceTokens.size, targetTokens.size);

  return tokenScore;
}

function findMatchingReuseCandidates(
  config: PropertyConfig,
  candidates: TemplateFieldReuseCandidate[]
): TemplateFieldReuseCandidate[] {
  const normalizedFieldName = normalizeComparisonValue(config.name);
  if (!normalizedFieldName || !config.fieldType) {
    return [];
  }

  return candidates
    .map((candidate) => {
      const candidateName = normalizeComparisonValue(candidate.name);
      const nameScore = getNameSimilarityScore(
        normalizedFieldName,
        candidateName
      );
      const typeBonus = candidate.datatype === config.fieldType ? 0.15 : 0;
      return {
        candidate,
        score: nameScore + typeBonus,
      };
    })
    .filter(({ candidate, score }) => {
      const hasSameType = candidate.datatype === config.fieldType;
      return score >= (hasSameType ? 0.75 : 0.92);
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ candidate }) => candidate);
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
    connectExistingTemplateFieldMutation,
    deleteTemplateFieldMutation,
    setDefaultCategoriesMutation,
    setTemplateRequiredUserPropertiesMutation,
    isSaving,
  } = useTemplateMutations();
  const { showDefault, showDestructive } = useConfirmDialog();

  const { data: template, isLoading: templateLoading } = useTemplate(
    isEdit ? templateId : null
  );
  const effectiveOrgId =
    isEdit && template ? (template.org_id ?? undefined) : orgIdProp;
  const { data: icons = [] } = useTemplateIcons();
  const { data: org } = useOrganization(effectiveOrgId);
  const { data: orgCategories = [] } = useCategories(effectiveOrgId);
  const { data: availableUserProps } = useUserProperties(
    effectiveOrgId ?? null
  );
  const { data: templateFieldReuseCandidates = [] } =
    useTemplateFieldReuseCandidates(effectiveOrgId, templateId);

  const form = useForm<TemplateFormInputValues, unknown, TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      icon_id: '',
      description: '',
    },
  });

  const { register, control, formState, watch, setValue, reset } = form;
  const { errors } = formState;

  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [customFieldStep, setCustomFieldStep] = useState<
    | 'typeSelection'
    | 'configuration'
    | 'existingFieldSelection'
    | 'reuseSuggestion'
  >('typeSelection');
  const [customFieldConfig, setCustomFieldConfig] =
    useState<PropertyConfig>(INITIAL_CONFIG);
  const [matchingReuseCandidates, setMatchingReuseCandidates] = useState<
    TemplateFieldReuseCandidate[]
  >([]);
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
  /** Time range dialog: start/end strings and validation error. */
  const [timeRangeStartValue, setTimeRangeStartValue] = useState('');
  const [timeRangeEndValue, setTimeRangeEndValue] = useState('');
  const [timeRangeError, setTimeRangeError] = useState<string | null>(null);
  /** Required user properties for this template (Überprüfungen). */
  const [requiredUserPropertyConfigs, setRequiredUserPropertyConfigs] =
    useState<
      Array<{
        user_property_id: string;
        is_required: boolean;
        min_matching_users: number | null;
      }>
    >([]);
  const requiredUserPropertyConfigsRef = useRef(requiredUserPropertyConfigs);
  const personeneigenschaftenSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requiredUserPropertyConfigsRef.current = requiredUserPropertyConfigs;
  }, [requiredUserPropertyConfigs]);

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
    const raw = template?.template_user_property ?? [];
    setRequiredUserPropertyConfigs(
      raw.map((p) => ({
        user_property_id: p.user_property_id,
        is_required: p.is_required ?? true,
        min_matching_users:
          typeof p.min_matching_users === 'number'
            ? p.min_matching_users
            : p.min_matching_users == null
              ? 1
              : null,
      }))
    );
  }, [template]);

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

  const handlePause = useCallback(async () => {
    const isPaused = template?.is_paused ?? false;
    const result = await showDefault(
      isPaused ? 'Vorlage reaktivieren?' : 'Vorlage pausieren?',
      isPaused
        ? 'Die Vorlage wird wieder für neue Einsätze verfügbar gemacht.'
        : 'Pausierte Vorlagen können nicht für neue Einsätze verwendet werden. Bestehende Einsätze bleiben unverändert.'
    );
    if (result === 'success' && templateId) {
      updateMutation.mutate({ templateId, is_paused: !isPaused });
    }
  }, [showDefault, template?.is_paused, templateId, updateMutation]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (customFieldDialogOpen || editingStandardFieldKey != null) {
          return;
        }
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
  }, [
    form,
    onSubmit,
    handleCancel,
    customFieldDialogOpen,
    editingStandardFieldKey,
  ]);

  const formName = watch('name');
  const trimmedFormName = typeof formName === 'string' ? formName.trim() : '';
  const pageTitle = isEdit
    ? template
      ? `'${trimmedFormName}' bearbeiten`
      : 'Vorlage erstellen'
    : `Erstelle Vorlage ${trimmedFormName ? `'${trimmedFormName}'` : ''}`;

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
  const editingTemplateField =
    editingFieldId != null
      ? template?.template_field?.find((tf) => tf.field?.id === editingFieldId)
      : undefined;
  const existingTemplateFieldNamesForDialog = editingFieldName
    ? existingTemplateFieldNames.filter(
        (n) => n !== String(editingFieldName).toLowerCase()
      )
    : existingTemplateFieldNames;

  const editingFieldUsageNames =
    editingTemplateField?.field?.template_field
      ?.map((templateFieldLink) =>
        templateFieldLink.einsatz_template.name?.trim()
      )
      .filter((name): name is string => Boolean(name))
      .sort((left, right) => left.localeCompare(right, 'de-AT')) ?? [];

  const editingFieldUsageInfo =
    editingFieldId == null ? null : (
      <div className="space-y-2">
        <div className="flex justify-between gap-4">
          <div>
            <p className="shrink-0">
              {editingFieldUsageNames.length > 0
                ? `Dieses Feld wird in ${editingFieldUsageNames.length} Vorlage${
                    editingFieldUsageNames.length === 1 ? '' : 'n'
                  } verwendet.`
                : 'Dieses Feld ist aktuell nur in dieser Vorlage hinterlegt.'}
            </p>
            {editingFieldUsageNames.length > 0 && (
              <p className="text-xs text-slate-500">
                Änderungen an diesem Feld wirken sich auf alle Vorlagen aus, die
                es verwenden.
              </p>
            )}
          </div>
          <div className="flex shrink flex-wrap justify-end gap-1.5">
            {editingFieldUsageNames.map((templateName) => (
              <Badge
                key={templateName}
                variant="outline"
                className="px-1.5 py-0 text-[10px] font-medium"
              >
                {templateName}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );

  type TemplateFieldItem = NonNullable<
    NonNullable<typeof template>['template_field']
  >[number];
  const templateFieldToPropertyConfig = useCallback(
    (tf: TemplateFieldItem): PropertyConfig | null => {
      const f = tf?.field;
      if (!f) return null;
      return fieldToPropertyConfig(f);
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
    setMatchingReuseCandidates([]);
    setCustomFieldStep('typeSelection');
    setCustomFieldDialogOpen(true);
  }, []);

  const handleOpenEditField = useCallback(
    (tf: TemplateFieldItem) => {
      const config = templateFieldToPropertyConfig(tf);
      if (!config) return;
      setCustomFieldConfig(config);
      setMatchingReuseCandidates([]);
      setEditingFieldId(tf.field?.id ?? null);
      setCustomFieldStep('configuration');
      setCustomFieldDialogOpen(true);
    },
    [templateFieldToPropertyConfig]
  );

  const resetCustomFieldDialog = useCallback(() => {
    setCustomFieldDialogOpen(false);
    setCustomFieldStep('typeSelection');
    setCustomFieldConfig(INITIAL_CONFIG);
    setEditingFieldId(null);
    setMatchingReuseCandidates([]);
  }, []);

  const createCustomField = useCallback(() => {
    if (!templateId || !customFieldConfig.fieldType) return;
    addTemplateFieldMutation.mutate(
      { templateId, config: customFieldConfig },
      {
        onSuccess: () => {
          resetCustomFieldDialog();
        },
      }
    );
  }, [
    templateId,
    customFieldConfig,
    addTemplateFieldMutation,
    resetCustomFieldDialog,
  ]);

  const handleConnectExistingField = useCallback(
    (fieldId: string) => {
      if (!templateId) return;
      connectExistingTemplateFieldMutation.mutate(
        { templateId, fieldId },
        {
          onSuccess: () => {
            resetCustomFieldDialog();
          },
        }
      );
    },
    [templateId, connectExistingTemplateFieldMutation, resetCustomFieldDialog]
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
            resetCustomFieldDialog();
          },
        }
      );
    } else {
      const matchingCandidates = findMatchingReuseCandidates(
        customFieldConfig,
        templateFieldReuseCandidates
      );
      if (matchingCandidates.length > 0) {
        setMatchingReuseCandidates(matchingCandidates);
        setCustomFieldStep('reuseSuggestion');
        return;
      }

      createCustomField();
    }
  }, [
    templateId,
    customFieldConfig,
    editingFieldId,
    templateFieldReuseCandidates,
    updateTemplateFieldMutation,
    createCustomField,
    resetCustomFieldDialog,
  ]);

  const handleCustomFieldDialogClose = useCallback(
    (open: boolean) => {
      if (!open) {
        resetCustomFieldDialog();
      }
    },
    [resetCustomFieldDialog]
  );

  useEffect(() => {
    if (editingStandardFieldKey && template) {
      switch (editingStandardFieldKey) {
        case 'name':
          setStandardFieldDefaultValue(
            String(template.einsatzname_default ?? '')
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
        case 'time_range':
          setTimeRangeStartValue(
            formatTimeForInput(template.time_start_default)
          );
          setTimeRangeEndValue(formatTimeForInput(template.time_end_default));
          setTimeRangeError(null);
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
        case 'total_price':
          setStandardFieldDefaultValue(
            String(template.total_price_default ?? '')
          );
          setStandardFieldPlaceholderValue(
            String(template.total_price_placeholder ?? '')
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
        case 'anmerkung':
          setStandardFieldDefaultValue(
            String(template.anmerkung_default ?? '')
          );
          setStandardFieldPlaceholderValue(
            String(template.anmerkung_placeholder ?? '')
          );
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
      case 'time_range': {
        const startDate = parseTimeFromInput(timeRangeStartValue);
        const endDate = parseTimeFromInput(timeRangeEndValue);
        if (
          startDate != null &&
          endDate != null &&
          endDate.getTime() <= startDate.getTime()
        ) {
          setTimeRangeError('Endzeit muss nach der Startzeit liegen.');
          return;
        }
        setTimeRangeError(null);
        payload.time_start_default = startDate;
        payload.time_end_default = endDate;
        break;
      }
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
      case 'total_price':
        payload.total_price_default = defaultFloat(standardFieldDefaultValue);
        payload.total_price_placeholder = defaultFloat(
          standardFieldPlaceholderValue
        );
        break;
      case 'anmerkung':
        payload.anmerkung_default = defaultStr(standardFieldDefaultValue);
        payload.anmerkung_placeholder = defaultStr(
          standardFieldPlaceholderValue
        );
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
    timeRangeStartValue,
    timeRangeEndValue,
    selectedDefaultCategoryIds,
    updateMutation,
    setDefaultCategoriesMutation,
  ]);

  const handleStandardFieldDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setEditingStandardFieldKey(null);
      setTimeRangeError(null);
    }
  }, []);

  const editingStandardFieldName =
    editingStandardFieldKey &&
    STANDARD_FIELDS.find((f) => f.standardFieldKey === editingStandardFieldKey)
      ?.name;

  const handleDeleteField = useCallback(
    async (fieldId: string) => {
      const tf = template?.template_field?.find((t) => t.field?.id === fieldId);
      const name = tf?.field?.name ?? 'Feld';
      const result = await showDestructive(
        'Feld von Vorlage entfernen?',
        `Möchten Sie das Feld "${name}" von dieser Vorlage entfernen? Das Feld wird nur von der Vorlage getrennt. Bestehende Einsätze behalten ihre gespeicherten Werte für dieses Feld.`
      );
      if (result === 'success' && templateId) {
        deleteTemplateFieldMutation.mutate({ templateId, fieldId });
      }
    },
    [
      template?.template_field,
      templateId,
      showDestructive,
      deleteTemplateFieldMutation,
    ]
  );

  const maxParticipantsPerHelper = org?.max_participants_per_helper ?? 20;
  const helperSingular = org?.helper_name_singular ?? 'Helfer:in';
  const helperPlural = org?.helper_name_plural ?? 'Helfer:innen';

  const handleRequiredUserPropertySelectionChange = useCallback(
    (selectedIds: string[]) => {
      setRequiredUserPropertyConfigs((prev) =>
        selectedIds.map((id) => {
          const existing = prev.find((c) => c.user_property_id === id);
          return (
            existing ?? {
              user_property_id: id,
              is_required: true,
              min_matching_users: 1,
            }
          );
        })
      );
    },
    []
  );

  const handleRequiredUserPropertyConfigChange = useCallback(
    (
      propertyId: string,
      updates: { is_required?: boolean; min_matching_users?: number | null }
    ) => {
      setRequiredUserPropertyConfigs((prev) =>
        prev.map((config) =>
          config.user_property_id === propertyId
            ? { ...config, ...updates }
            : config
        )
      );
    },
    []
  );

  /** Valid: every config has user_property_id; when is_required, min_matching_users is a number. */
  const areRequiredUserPropertyConfigsValid = useCallback(
    (
      configs: Array<{
        user_property_id: string;
        is_required: boolean;
        min_matching_users: number | null;
      }>
    ) =>
      configs.every(
        (c) =>
          c.user_property_id &&
          (!c.is_required || typeof c.min_matching_users === 'number')
      ),
    []
  );

  const saveRequiredUserPropertiesOnBlur = useCallback(() => {
    if (!templateId) return;
    const configs = requiredUserPropertyConfigsRef.current;
    if (!areRequiredUserPropertyConfigsValid(configs)) return;
    setTemplateRequiredUserPropertiesMutation.mutate({ templateId, configs });
  }, [
    templateId,
    areRequiredUserPropertyConfigsValid,
    setTemplateRequiredUserPropertiesMutation,
  ]);

  const handlePersoneneigenschaftenSectionBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const wrapper = personeneigenschaftenSectionRef.current;
      const nextTarget = e.relatedTarget ?? document.activeElement;
      if (wrapper?.contains(nextTarget as Node)) return;
      requestAnimationFrame(() => {
        if (wrapper?.contains(document.activeElement)) return;
        saveRequiredUserPropertiesOnBlur();
      });
    },
    [saveRequiredUserPropertiesOnBlur]
  );

  const header = (
    <PageHeader
      title={pageTitle}
      onSave={() => form.handleSubmit(onSubmit)()}
      isSaving={isSaving}
      onCancel={handleCancel}
      disableHorizontalPadding={true}
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
                Name, Beschreibung und Icon dieser Vorlage.
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
                      <SelectTrigger id="template-icon" className="h-10">
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
                Standardfelder sind in jedem Einsatz dieser Vorlage vorhanden.
                Du kannst hier nur ihre Standardwerte anpassen, aber keine
                weiteren Standardfelder hinzufügen oder entfernen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StandardFieldsList
                helperPlural={helperPlural}
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
                          <div key={cat.id} className="flex items-center gap-2">
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
                {editingStandardFieldKey === 'anmerkung' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="standard-field-default">
                        Standardwert (optional)
                      </Label>
                      <Textarea
                        id="standard-field-default"
                        value={standardFieldDefaultValue}
                        onChange={(e) =>
                          setStandardFieldDefaultValue(e.target.value)
                        }
                        placeholder="Leer = kein Standard"
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="standard-field-placeholder">
                        Platzhalter (optional)
                      </Label>
                      <Textarea
                        id="standard-field-placeholder"
                        value={standardFieldPlaceholderValue}
                        onChange={(e) =>
                          setStandardFieldPlaceholderValue(e.target.value)
                        }
                        placeholder="Leer = kein Platzhalter"
                        rows={4}
                      />
                    </div>
                  </>
                )}
                {editingStandardFieldKey === 'time_range' && (
                  <div className="space-y-4">
                    {template?.all_day_default === true && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          Die Uhrzeit wird bei Einsätzen nicht angezeigt, wenn
                          Ganztägig aktiviert ist.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="time-range-start">
                        Uhrzeit von (optional)
                      </Label>
                      <Input
                        id="time-range-start"
                        type="time"
                        value={timeRangeStartValue}
                        onChange={(e) => {
                          setTimeRangeStartValue(e.target.value);
                          setTimeRangeError(null);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-range-end">
                        Uhrzeit bis (optional)
                      </Label>
                      <Input
                        id="time-range-end"
                        type="time"
                        value={timeRangeEndValue}
                        onChange={(e) => {
                          setTimeRangeEndValue(e.target.value);
                          setTimeRangeError(null);
                        }}
                      />
                    </div>
                    {timeRangeError && (
                      <p className="text-destructive text-sm">
                        {timeRangeError}
                      </p>
                    )}
                  </div>
                )}
                {editingStandardFieldKey !== 'all_day' &&
                  editingStandardFieldKey !== 'kategorie' &&
                  editingStandardFieldKey !== 'name' &&
                  editingStandardFieldKey !== 'anmerkung' &&
                  editingStandardFieldKey !== 'time_range' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="standard-field-default">
                          Standardwert (optional)
                        </Label>
                        <Input
                          id="standard-field-default"
                          type={
                            editingStandardFieldKey === 'price_person' ||
                            editingStandardFieldKey === 'participant_count' ||
                            editingStandardFieldKey === 'helpers_needed' ||
                            editingStandardFieldKey === 'total_price'
                              ? 'number'
                              : 'text'
                          }
                          step={
                            editingStandardFieldKey === 'price_person' ||
                            editingStandardFieldKey === 'total_price'
                              ? '0.01'
                              : editingStandardFieldKey ===
                                    'participant_count' ||
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
                            editingStandardFieldKey === 'price_person' ||
                            editingStandardFieldKey === 'participant_count' ||
                            editingStandardFieldKey === 'helpers_needed' ||
                            editingStandardFieldKey === 'total_price'
                              ? 'number'
                              : 'text'
                          }
                          step={
                            editingStandardFieldKey === 'price_person' ||
                            editingStandardFieldKey === 'total_price'
                              ? '0.01'
                              : editingStandardFieldKey ===
                                    'participant_count' ||
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
                Ergänze die Standardfelder um eigene zusätzliche Felder oder
                verknüpfe ein bereits vorhandenes Feld, um es mit anderen
                Vorlagen gemeinsam zu nutzen.
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
                    const key = isFieldTypeKey(datatype) ? datatype : 'text';
                    const fieldDef = getFieldTypeDefinition(key);
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
                    ? `${editingFieldName} bearbeiten`
                    : 'Eigenes Feld hinzufügen'}
                </DialogTitle>
              </DialogHeader>
              {customFieldStep === 'typeSelection' ? (
                <FieldTypeSelector
                  onSelectType={handleCustomFieldTypeSelect}
                  onBack={() => handleCustomFieldDialogClose(false)}
                  onSelectExistingField={() =>
                    setCustomFieldStep('existingFieldSelection')
                  }
                  enabledFieldTypes={VORLAGE_SELECTABLE_FIELD_TYPES}
                />
              ) : customFieldStep === 'existingFieldSelection' ? (
                <ExistingTemplateFieldSelector
                  candidates={templateFieldReuseCandidates}
                  isConnecting={connectExistingTemplateFieldMutation.isPending}
                  onBack={() => setCustomFieldStep('typeSelection')}
                  onConnect={handleConnectExistingField}
                />
              ) : customFieldStep === 'reuseSuggestion' ? (
                <TemplateFieldReuseSuggestions
                  fieldName={customFieldConfig.name.trim() || 'Neues Feld'}
                  candidates={matchingReuseCandidates}
                  isConnecting={connectExistingTemplateFieldMutation.isPending}
                  isCreating={addTemplateFieldMutation.isPending}
                  onBack={() => setCustomFieldStep('configuration')}
                  onCreateNew={createCustomField}
                  onConnect={handleConnectExistingField}
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
                  nameLabel="Label *"
                  usageInfo={editingFieldUsageInfo}
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
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <TemplateFieldListItem
                  name={
                    <>
                      Anzahl Teilnehmer:innen maximal{' '}
                      <span className="text-primary font-semibold">
                        {maxParticipantsPerHelper}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        pro {helperSingular}
                      </span>
                    </>
                  }
                  typeLabel="Feld"
                  icon={Hash}
                />
              </ul>
              <div
                ref={personeneigenschaftenSectionRef}
                onBlur={handlePersoneneigenschaftenSectionBlur}
                className="space-y-3"
              >
                <Label className="text-sm font-medium">
                  Benötigte Personeneigenschaften
                </Label>
                <MultiSelect
                  options={
                    availableUserProps
                      ?.filter((p) => p.field?.name != null)
                      .map((prop) => ({
                        value: prop.id,
                        label: String(prop.field.name),
                      })) ?? []
                  }
                  value={requiredUserPropertyConfigs.map(
                    (c) => c.user_property_id
                  )}
                  onValueChange={handleRequiredUserPropertySelectionChange}
                  placeholder="Eigenschaften auswählen..."
                  disabled={!templateId}
                />
                {requiredUserPropertyConfigs.length > 0 && (
                  <div className="border-muted space-y-2 border-l-2 pl-4">
                    {requiredUserPropertyConfigs.map((config) => {
                      const prop = availableUserProps?.find(
                        (p) => p.id === config.user_property_id
                      );
                      if (!prop) return null;
                      return (
                        <div
                          key={config.user_property_id}
                          className="bg-muted/50 flex items-center gap-3 rounded-md p-2"
                        >
                          <div className="flex-1 text-sm font-medium">
                            {prop.field.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`required-${config.user_property_id}`}
                              checked={config.is_required}
                              onCheckedChange={(checked) =>
                                handleRequiredUserPropertyConfigChange(
                                  config.user_property_id,
                                  { is_required: checked === true }
                                )
                              }
                            />
                            <Label
                              htmlFor={`required-${config.user_property_id}`}
                              className="cursor-pointer text-xs"
                            >
                              Erforderlich
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`min-${config.user_property_id}`}
                              className="text-xs whitespace-nowrap"
                            >
                              Min:
                            </Label>
                            <div className="relative">
                              <input
                                id={`min-${config.user_property_id}`}
                                type="number"
                                min={0}
                                disabled={!config.is_required}
                                className={cn(
                                  'h-8 w-20 rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50',
                                  config.is_required &&
                                    config.min_matching_users === -1 &&
                                    'text-transparent'
                                )}
                                value={
                                  !config.is_required
                                    ? ''
                                    : config.min_matching_users === -1
                                      ? 0
                                      : (config.min_matching_users ?? 1)
                                }
                                onChange={(e) => {
                                  if (!config.is_required) return;
                                  const value = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(value) && value >= 0) {
                                    handleRequiredUserPropertyConfigChange(
                                      config.user_property_id,
                                      {
                                        min_matching_users:
                                          value === 0 ? -1 : value,
                                      }
                                    );
                                  }
                                }}
                                placeholder={config.is_required ? '1' : '-'}
                              />
                              {config.is_required &&
                                config.min_matching_users === -1 && (
                                  <span className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm">
                                    Alle
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="bg-background/95 supports-backdrop-filter:bg-background/10 sticky bottom-0 z-40 flex items-center justify-between gap-2 border-t py-4 backdrop-blur-sm">
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
    <div className="bg-card mx-auto max-w-7xl rounded-xl py-6 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {header}
        {formContent}
      </div>
    </div>
  );
}
