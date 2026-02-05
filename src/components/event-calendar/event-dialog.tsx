'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { RiDeleteBinLine } from '@remixicon/react';
import { FileDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import z from 'zod';
import {
  generateDynamicSchema,
  handleDelete,
  handlePdfGenerate,
  mapDbDataTypeToFormFieldType,
  mapFieldsForSchema,
  mapStringValueToType,
  mapTypeToStringValue,
} from './utils';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DefaultEndHour,
  DefaultStartHour,
  EndHour,
  StartHour,
  StatusValuePairs,
} from '@/components/event-calendar/constants';
import { EinsatzCreate, EinsatzDetailed } from '@/features/einsatz/types';
import FormGroup from '../form/formGroup';
import FormInputFieldCustom from '../form/formInputFieldCustom';
import ToggleItemBig from '../form/toggle-item-big';
import {
  useDetailedEinsatz,
  useCategories,
} from '@/features/einsatz/hooks/useEinsatzQueries';
import { useTemplates } from '@/features/template/hooks/use-template-queries';
import { useUsers } from '@/features/user/hooks/use-user-queries';
import { useUserProperties } from '@/features/user_properties/hooks/use-user-property-queries';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { DefaultFormFields } from '@/components/event-calendar/defaultFormFields';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import { CustomFormField, SupportedDataTypes } from './types';
import DynamicFormFields from './dynamicFormfields';
import {
  buildInputProps,
  calcTotal,
  calcPricePerPersonFromTotal,
} from '../form/utils';
import TooltipCustom from '../tooltip-custom';

import { usePdfGenerator } from '@/features/pdf/hooks/usePdfGenerator';
import { useSession } from 'next-auth/react';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { toast } from 'sonner';
import { createChangeLogAuto } from '@/features/activity_log/activity_log-dal';
import { ChangeTypeIds } from '@/features/activity_log/changeTypeIds';
import {
  detectChangeTypes,
  getAffectedUserId,
} from '@/features/activity_log/utils';
import { Select, SelectContent, SelectItem } from '../ui/select';
import { SelectTrigger } from '@radix-ui/react-select';
import { EinsatzActivityLog } from '@/features/activity_log/components/ActivityLogWrapperEinsatzDialog';
import { RequiredUserProperties } from './RequiredUserProperties';
import { Separator } from '../ui/separator';

// Defaults for the defaultFormFields (no template loaded yet)
const DEFAULTFORMDATA: EinsatzFormData = {
  title: '',
  einsatzCategoriesIds: [],
  startDate: new Date(),
  endDate: new Date(),
  startTime: `${DefaultStartHour}:00`,
  endTime: `${DefaultEndHour}:00`,
  all_day: false,
  participantCount: 20,
  pricePerPerson: 0,
  totalPrice: 0,
  helpersNeeded: 1,
  assignedUsers: [],
  requiredUserProperties: [],
  confirmAsBestätigt: false,
};

function formatOrgTimeForInput(value: unknown, fallback: string): string {
  if (!value) return fallback;

  // Handle "HH:MM:SS" (or "HH:MM") strings directly to avoid timezone issues
  if (typeof value === 'string') {
    const m = value.match(/^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (m?.[1] && m?.[2]) return `${m[1]}:${m[2]}`;

    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      // If this is an ISO string with Z (UTC), use UTC components
      const useUtc = value.endsWith('Z');
      const hours = (useUtc ? d.getUTCHours() : d.getHours())
        .toString()
        .padStart(2, '0');
      const minutes = (useUtc ? d.getUTCMinutes() : d.getMinutes())
        .toString()
        .padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    return fallback;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return fallback;
}

export const ZodEinsatzFormData = z
  .object({
    title: z.string().min(1, 'Titel ist erforderlich'),
    einsatzCategoriesIds: z.array(z.uuid()),
    startDate: z.date(),
    endDate: z.date(),
    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Invalid time format. Must be in HH:MM (24-hour) format.'
      ),
    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Invalid time format. Must be in HH:MM (24-hour) format.'
      ),
    all_day: z.boolean(),
    participantCount: z
      .number()
      .min(0, 'Teilnehmeranzahl darf nicht negativ sein'),
    pricePerPerson: z.number().min(0, 'Preis darf nicht negativ sein'),
    totalPrice: z.number().min(0, 'Gesamtpreis darf nicht negativ sein'),
    helpersNeeded: z.number().min(-1, 'Helfer-Anzahl muss 0 oder größer sein'),
    assignedUsers: z.array(z.uuid()),
    requiredUserProperties: z
      .array(
        z.object({
          user_property_id: z.string().uuid(),
          is_required: z.boolean(),
          min_matching_users: z.number().int().min(-1).nullable(),
        })
      )
      .optional(),
    anmerkung: z.string().optional(),
    confirmAsBestätigt: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Ensure end date is not before start date
      if (!data.all_day) {
        // For timed events, compare the full date-time
        const startDateTime = new Date(data.startDate);
        const endDateTime = new Date(data.endDate);

        const [startHours, startMinutes] = data.startTime
          .split(':')
          .map(Number);
        const [endHours, endMinutes] = data.endTime.split(':').map(Number);

        startDateTime.setHours(startHours, startMinutes, 0, 0);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        return endDateTime > startDateTime;
      } else {
        // For all-day events, just compare dates
        data.endDate.setHours(0, 0, 0, 0);
        data.startDate.setHours(0, 0, 0, 0);
        return data.endDate >= data.startDate;
      }
    },
    {
      message: 'Enddatum/zeit muss nach Startdatum/zeit liegen',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // Ensure totalPrice is consistent with individual prices
      const calculatedTotal = data.participantCount * data.pricePerPerson;
      const difference = Math.abs(data.totalPrice - calculatedTotal);
      return difference < 0.11;
    },
    {
      message:
        'Gesamtpreis stimmt nicht mit Teilnehmern und Preis pro Person überein',
      path: ['totalPrice'],
    }
  )
  .refine(
    (data) => {
      // Check if assigned users don't exceed helpers needed
      // Only validate if helpersNeeded is set (> 0) and we have assigned users
      if (data.helpersNeeded >= 0 && data.assignedUsers.length > 0) {
        return data.assignedUsers.length <= data.helpersNeeded;
      }
      return true; // Always valid if helpersNeeded is -1 (unlimited) or 0
    },
    {
      message:
        'Anzahl zugewiesener Personen darf die benötigten Helfer nicht überschreiten',
      path: ['assignedUsers'],
    }
  );

export type EinsatzFormData = z.infer<typeof ZodEinsatzFormData>;

interface EventDialogProps {
  einsatz: EinsatzCreate | EinsatzDetailed | string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (einsatz: EinsatzCreate) => void;
  onDelete: (eventId: string, eventTitle: string) => void;
}

export function EventDialogVerwaltung({
  einsatz,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const { data: session } = useSession();

  const activeOrgId = session?.user?.activeOrganization?.id;
  const currentUserId = session?.user?.id;

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const { generatePdf } = usePdfGenerator();
  const [staticFormData, setStaticFormData] =
    useState<EinsatzFormData>(DEFAULTFORMDATA);
  // state for validation on dynamic form data - generated once after template was selected
  const [dynamicSchema, setDynamicSchema] = useState<z.ZodObject<any> | null>(
    null
  );
  // used for rendering of dynamic form fields
  const [dynamicFormFields, setDynamicFormFields] = useState<CustomFormField[]>(
    []
  );

  // React Hook Form für dynamische Felder
  const dynamicForm = useForm<Record<string, any>>({
    resolver: dynamicSchema ? zodResolver(dynamicSchema) : undefined,
    mode: 'onChange',
    defaultValues: {},
  });

  const [errors, setErrors] = useState<{
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  }>({
    fieldErrors: {},
    formErrors: [],
  });

  // Track last programmatically synced start/end times so we don't overwrite user edits
  const lastSyncedStartRef = useRef<string | null>(null);
  const lastSyncedEndRef = useRef<string | null>(null);

  // Update form resolver when dynamicSchema changes
  useEffect(() => {
    if (dynamicSchema) {
      dynamicForm.clearErrors();
      dynamicForm.trigger();
    }
  }, [dynamicSchema]);

  // Fetch detailed einsatz data when einsatz is a string (UUID)
  const {
    data: detailedEinsatz,
    isLoading,
    isFetching,
  } = useDetailedEinsatz(typeof einsatz === 'string' ? einsatz : null, isOpen);

  const { data: availableProps } = useUserProperties(activeOrgId);

  const categoriesQuery = useCategories(activeOrgId);

  const templatesQuery = useTemplates(activeOrgId);

  const usersQuery = useUsers(activeOrgId);

  const { data: organizations } = useOrganizations(session?.user.orgIds);
  const activeOrg = organizations?.find((org) => org.id === activeOrgId);

  const orgDefaultStartTime = formatOrgTimeForInput(
    activeOrg?.default_starttime,
    `${DefaultStartHour.toString().padStart(2, '0')}:00`
  );
  const orgDefaultEndTime = formatOrgTimeForInput(
    activeOrg?.default_endtime,
    `${DefaultEndHour.toString().padStart(2, '0')}:00`
  );

  const { einsatz_singular } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  // type string means edit einsatz (uuid)
  const currentEinsatz =
    typeof einsatz === 'string' ? detailedEinsatz : einsatz;

  // React Hook Form übernimmt jetzt die Validierung automatisch

  const handleFormDataChange = useCallback(
    (updates: Partial<EinsatzFormData>) => {
      let nextFormData: EinsatzFormData | undefined;

      setStaticFormData((prev) => {
        const merged = { ...prev, ...updates };
        // When switching from "Ganztägig" to timed, reset start/end time to org defaults
        if (prev.all_day === true && updates.all_day === false) {
          merged.startTime = orgDefaultStartTime;
          merged.endTime = orgDefaultEndTime;
          lastSyncedStartRef.current = orgDefaultStartTime;
          lastSyncedEndRef.current = orgDefaultEndTime;
        }
        nextFormData = merged;
        return merged;
      });

      // Validate just the updated fields using partial schema
      const partialResult = ZodEinsatzFormData.partial().safeParse(updates);

      // Update errors based on partial validation
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };

        if (!partialResult.success) {
          // Add errors for the fields being updated
          const flattenedErrors = z.flattenError(partialResult.error);

          // Merge new field errors with existing ones
          Object.entries(flattenedErrors.fieldErrors).forEach(
            ([field, fieldErrors]) => {
              if (fieldErrors) {
                newErrors.fieldErrors[field] = fieldErrors;
              }
            }
          );

          // Add any form-level errors
          if (flattenedErrors.formErrors.length > 0) {
            newErrors.formErrors = [
              ...new Set([
                ...newErrors.formErrors,
                ...flattenedErrors.formErrors,
              ]),
            ];
          }
        } else {
          // Clear errors for the fields that are now valid
          Object.keys(updates).forEach((field) => {
            delete newErrors.fieldErrors[field];
          });
        }

        return newErrors;
      });

      if (!nextFormData) {
        return;
      }

      // Also run full validation for relationship checks (like date/time dependencies)
      const fullResult = ZodEinsatzFormData.safeParse(nextFormData);

      if (!fullResult.success) {
        // Only update relationship errors (like endDate validation)
        const relationshipErrors = fullResult.error.issues.filter(
          (issue) => issue.code === 'custom' || issue.path.includes('endDate')
        );

        if (relationshipErrors.length > 0) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            fieldErrors: {
              ...prevErrors.fieldErrors,
              ...relationshipErrors.reduce(
                (acc, error) => {
                  const field = error.path[0] as string;
                  acc[field] = [error.message];
                  return acc;
                },
                {} as Record<string, string[]>
              ),
            },
          }));
        }
      } else {
        // Clear relationship errors if full validation passes
        setErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          // Only clear endDate errors that are relationship-based
          if (
            newErrors.fieldErrors.endDate?.some(
              (error) => error.includes('nach') || error.includes('Enddatum')
            )
          ) {
            delete newErrors.fieldErrors.endDate;
          }
          return newErrors;
        });
      }
    },
    [orgDefaultStartTime, orgDefaultEndTime]
  );

  const getDefaultStaticFormData = useCallback((): EinsatzFormData => {
    const now = new Date();
    return {
      ...DEFAULTFORMDATA,
      startDate: now,
      endDate: now,
      startTime: orgDefaultStartTime,
      endTime: orgDefaultEndTime,
    };
  }, [orgDefaultStartTime, orgDefaultEndTime]);

  const resetForm = useCallback(() => {
    handleFormDataChange(getDefaultStaticFormData());
    setActiveTemplateId(null);
    setErrors({
      fieldErrors: {},
      formErrors: [],
    });
  }, [handleFormDataChange, getDefaultStaticFormData]);

  useEffect(() => {
    if (currentEinsatz && typeof currentEinsatz === 'object') {
      // Create new (EinsatzCreate)
      if (!currentEinsatz.id) {
        const createEinsatz = currentEinsatz as EinsatzCreate;
        // Use org defaults once organizations are available so we don't show 09:00/10:00 and only update after close
        const base = getDefaultStaticFormData();
        const createFormData: EinsatzFormData = {
          ...base,
          title: createEinsatz.title ?? '',
          all_day: createEinsatz.all_day ?? false,
          ...(createEinsatz.start && {
            startDate: createEinsatz.start,
            startTime: formatTimeForInput(createEinsatz.start),
          }),
          ...(createEinsatz.end && {
            endDate: createEinsatz.end,
            endTime: formatTimeForInput(createEinsatz.end),
          }),
        };
        setStaticFormData(createFormData);
        lastSyncedStartRef.current = createFormData.startTime;
        lastSyncedEndRef.current = createFormData.endTime;
        setActiveTemplateId(createEinsatz.template_id ?? null);
        // Reset errors when opening dialog
        setErrors({
          fieldErrors: {},
          formErrors: [],
        });
      } else {
        const einsatzDetailed = currentEinsatz as EinsatzDetailed;
        // Edit existing einsatz (loaded from query)
        setActiveTemplateId(currentEinsatz.template_id || null);
        setStaticFormData({
          title: einsatzDetailed.title || '',
          all_day: einsatzDetailed.all_day || false,
          startDate: einsatzDetailed.start || new Date(),
          startTime:
            formatTimeForInput(einsatzDetailed.start) || orgDefaultStartTime,
          endDate: einsatzDetailed.end || new Date(),
          endTime: formatTimeForInput(einsatzDetailed.end) || orgDefaultEndTime,
          participantCount: einsatzDetailed.participant_count || 0,
          pricePerPerson: einsatzDetailed.price_per_person || 0,
          totalPrice: einsatzDetailed.total_price || 0,
          helpersNeeded: einsatzDetailed.helpers_needed || 0,
          assignedUsers: einsatzDetailed.assigned_users || [],
          einsatzCategoriesIds: einsatzDetailed.categories || [],
          requiredUserProperties:
            einsatzDetailed.user_properties?.map((prop) => ({
              user_property_id: prop.user_property_id,
              is_required: prop.is_required,
              min_matching_users: prop.min_matching_users ?? null,
            })) || [],
          anmerkung: einsatzDetailed.anmerkung || '',
          // this should always reset to false (if something were to be edited)
          confirmAsBestätigt: false,
        });
        // Reset errors when opening dialog
        setErrors({
          fieldErrors: {},
          formErrors: [],
        });
      }
    } else {
      resetForm();
    }
  }, [
    currentEinsatz,
    handleFormDataChange,
    resetForm,
    isOpen,
    getDefaultStaticFormData,
    orgDefaultStartTime,
    orgDefaultEndTime,
    organizations,
  ]);

  // When in create mode and org defaults become available, sync start/end time only if user hasn't edited them
  useEffect(() => {
    if (
      isOpen &&
      currentEinsatz &&
      typeof currentEinsatz === 'object' &&
      !currentEinsatz.id &&
      activeOrg
    ) {
      setStaticFormData((prev) => {
        const userHasEditedTimes =
          lastSyncedStartRef.current !== null &&
          lastSyncedEndRef.current !== null &&
          (prev.startTime !== lastSyncedStartRef.current ||
            prev.endTime !== lastSyncedEndRef.current);
        if (userHasEditedTimes) {
          return prev;
        }
        lastSyncedStartRef.current = orgDefaultStartTime;
        lastSyncedEndRef.current = orgDefaultEndTime;
        return {
          ...prev,
          startTime: orgDefaultStartTime,
          endTime: orgDefaultEndTime,
        };
      });
    }
  }, [
    isOpen,
    currentEinsatz,
    activeOrg,
    orgDefaultStartTime,
    orgDefaultEndTime,
  ]);

  // Generate or refresh dynamic schema/data when template or detailed fields change
  useEffect(() => {
    if (templatesQuery.data) {
      const fields =
        templatesQuery.data.find((t) => t.id === activeTemplateId)
          ?.template_field || [];
      try {
        const mappedFields = mapFieldsForSchema(fields);
        const schema = generateDynamicSchema(mappedFields);
        setDynamicSchema(schema);
        setDynamicFormFields(
          fields.map((f) => ({
            id: f.field.id,
            displayName: f.field.name || f.field.id,
            placeholder: f.field.placeholder,
            defaultValue: f.field.default_value ?? null,
            required: f.field.is_required === true,
            groupName: f.field.group_name ?? null,
            isMultiline: f.field.is_multiline,
            min: f.field.min,
            max: f.field.max,
            allowedValues: f.field.allowed_values,
            inputType:
              f.field.is_multiline === true
                ? 'textarea'
                : mapDbDataTypeToFormFieldType(f.field?.type?.datatype),
            dataType: (f.field.type?.datatype as SupportedDataTypes) || 'text',
            inputProps: buildInputProps(f.field.type?.datatype, {
              placeholder: f.field.placeholder,
              min: f.field.min,
              max: f.field.max,
            }) as InputHTMLAttributes<HTMLInputElement>,
          }))
        );

        // Populate React Hook Form with field values (saved einsatz data or template default_value)
        const formValues = fields.reduce(
          (acc, f) => {
            const value =
              detailedEinsatz?.einsatz_fields?.find(
                (ef) => ef.field_id === f.field.id
              )?.value ?? f.field.default_value;
            acc[f.field.id] = mapStringValueToType(
              value,
              f.field.type?.datatype || 'text'
            );
            return acc;
          },
          {} as Record<string, any>
        );

        // Reset form with new values so dynamic fields show saved or default values
        dynamicForm.reset(formValues);
      } catch (error) {
        console.error('Error generating schema: ' + error);
      }
    }
  }, [
    activeTemplateId,
    templatesQuery.data,
    detailedEinsatz?.einsatz_fields,
    dynamicForm,
  ]);

  const formatTimeForInput = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const checkIfFormIsModified = (o1: EinsatzFormData, o2: EinsatzFormData) => {
    if (o1.participantCount !== o2.participantCount) {
      return true;
    }
    if (o1.pricePerPerson !== o2.pricePerPerson) {
      return true;
    }
    if (o1.helpersNeeded !== o2.helpersNeeded) {
      return true;
    }
    if (o1.all_day !== o2.all_day) {
      return true;
    }
    return false;
  };

  const handleTemplateSelect = async (templateId: string) => {
    const selectedTemplate = templatesQuery.data?.find(
      (t) => t.id === templateId
    );

    // function checks if values that are set below in handleTemplateSelect have been modified - could add check if some data is undefined
    if (checkIfFormIsModified(DEFAULTFORMDATA, staticFormData)) {
      const dialogResult = await showDialog({
        title: `${selectedTemplate?.name || 'Vorlage'} laden?`,
        description: `Ausgefüllte Felder werden möglicherweise Überschrieben.`,
      });

      if (dialogResult !== 'success') {
        toast.info(
          'Vorlage nicht geladen. Es wurden keine Änderungen vorgenommen.'
        );
        return;
      }
    }

    setActiveTemplateId(templateId);

    // Load template data and populate form (only template defaults; placeholders are visual only; fallbacks stay hardcoded)
    if (selectedTemplate) {
      const templateUpdates: Partial<EinsatzFormData> = {};

      // Name (einsatzname_default)
      const nameDefault = (
        selectedTemplate as { einsatzname_default?: string | null }
      ).einsatzname_default;
      if (nameDefault != null && nameDefault.trim() !== '') {
        templateUpdates.title = nameDefault.trim();
      }

      // Default categories (template_to_category)
      const defaultCategoryIds =
        selectedTemplate.template_to_category
          ?.map((t) => t.category_id)
          .filter((id): id is string => id != null) ?? [];
      if (defaultCategoryIds.length > 0) {
        templateUpdates.einsatzCategoriesIds = defaultCategoryIds;
      }

      // Start and end time
      if (
        (selectedTemplate as { time_start_default?: Date | null })
          .time_start_default
      ) {
        templateUpdates.startTime = formatOrgTimeForInput(
          (selectedTemplate as { time_start_default?: Date | null })
            .time_start_default,
          staticFormData.startTime
        );
      }
      if (
        (selectedTemplate as { time_end_default?: Date | null })
          .time_end_default
      ) {
        templateUpdates.endTime = formatOrgTimeForInput(
          (selectedTemplate as { time_end_default?: Date | null })
            .time_end_default,
          staticFormData.endTime
        );
      }

      if (selectedTemplate.participant_count_default != null) {
        templateUpdates.participantCount =
          selectedTemplate.participant_count_default;
      }
      if (selectedTemplate.helpers_needed_default != null) {
        templateUpdates.helpersNeeded = selectedTemplate.helpers_needed_default;
      }
      if (selectedTemplate.all_day_default != null) {
        templateUpdates.all_day = selectedTemplate.all_day_default;
      }

      const finalParticipantCount =
        templateUpdates.participantCount ??
        staticFormData.participantCount ??
        DEFAULTFORMDATA.participantCount;

      // Total price and price per person: use total_price_default when set (derive price per person), else use price_person_default (derive total)
      const totalDefault = selectedTemplate.total_price_default;
      const pricePerPersonDefault = selectedTemplate.price_person_default;

      // use !== null instead of !! to not falsely flag 0
      if (totalDefault != null && finalParticipantCount > 0) {
        templateUpdates.totalPrice = totalDefault;
        templateUpdates.pricePerPerson = calcPricePerPersonFromTotal(
          totalDefault,
          finalParticipantCount
        );
      } else if (pricePerPersonDefault != null) {
        templateUpdates.pricePerPerson = pricePerPersonDefault;
        templateUpdates.totalPrice = calcTotal(
          pricePerPersonDefault,
          finalParticipantCount
        );
      } else {
        const finalPricePerPerson =
          staticFormData.pricePerPerson ?? DEFAULTFORMDATA.pricePerPerson;
        templateUpdates.totalPrice =
          finalParticipantCount * finalPricePerPerson;
      }

      // Required user properties from template (Benötigte Personeneigenschaften)
      const templateUserProps = (
        selectedTemplate as {
          template_user_property?: Array<{
            user_property_id: string;
            is_required: boolean;
            min_matching_users: number | null;
          }>;
        }
      ).template_user_property;
      if (templateUserProps?.length) {
        templateUpdates.requiredUserProperties = templateUserProps.map(
          (prop) => ({
            user_property_id: prop.user_property_id,
            is_required: prop.is_required,
            min_matching_users: prop.min_matching_users ?? null,
          })
        );
      }

      // Apply template values to form
      handleFormDataChange(templateUpdates);
    }
  };

  const handleSave = async () => {
    // Validiere statische Felder
    const parsedDataStatic = ZodEinsatzFormData.safeParse(staticFormData);

    if (!parsedDataStatic.success) {
      const flattenedErrors = z.flattenError(parsedDataStatic.error);
      setErrors({
        fieldErrors: flattenedErrors.fieldErrors,
        formErrors: flattenedErrors.formErrors || [],
      });
      return;
    }
    const assignedUsers = Array.from(
      new Set(parsedDataStatic.data.assignedUsers)
    );

    // Validiere dynamische Felder mit React Hook Form
    const isDynamicFormValid = await dynamicForm.trigger();
    if (!isDynamicFormValid) {
      toast.error('Bitte korrigieren Sie die Fehler in den Template-Feldern.');
      return;
    }

    setErrors({
      fieldErrors: {},
      formErrors: [],
    });

    const warnings: string[] = [];

    // Warning 1: Max X participants per helper
    if (
      parsedDataStatic.data.helpersNeeded > 0 &&
      parsedDataStatic.data.participantCount > 0
    ) {
      const ratio =
        parsedDataStatic.data.participantCount /
        parsedDataStatic.data.helpersNeeded;
      const maxParticipants = organizations?.find(
        (o) => o.id === activeOrgId
      )?.max_participants_per_helper;
      if (maxParticipants && ratio > maxParticipants) {
        warnings.push(
          `Allgemein: Anzahl Teilnehmer:innen pro Helfer maximal ${
            organizations?.find((o) => o.id === activeOrgId)
              ?.max_participants_per_helper
          } (aktuell: ${Math.round(ratio)})`
        );
      }
    }

    // Warning 2: Required user properties check
    if (
      parsedDataStatic.data.requiredUserProperties &&
      parsedDataStatic.data.requiredUserProperties.length > 0
    ) {
      const assignedUserDetails = usersQuery.data?.filter((user) =>
        assignedUsers.includes(user.id)
      );

      for (const propConfig of parsedDataStatic.data.requiredUserProperties) {
        if (!propConfig.is_required) continue;

        const property = availableProps?.find(
          (p) => p.id === propConfig.user_property_id
        );
        if (!property) continue;

        const usersWithProperty = assignedUserDetails?.filter((user) => {
          const userPropValue = user.user_property_value?.find(
            (upv) => upv.user_property_id === propConfig.user_property_id
          );

          if (property.field.type?.datatype === 'boolean') {
            const val = String(userPropValue?.value ?? '')
              .toLowerCase()
              .trim();
            return val === 'true' || val === '1';
          }

          return (
            userPropValue?.value && String(userPropValue.value).trim() !== ''
          );
        });

        const matchingCount = usersWithProperty?.length || 0;
        const minRequired = propConfig.min_matching_users ?? 1;

        // Wenn -1 = "Alle zugewiesenen Personen müssen die Eigenschaft haben"
        const requiredCount =
          minRequired === -1 ? assignedUserDetails?.length || 0 : minRequired;

        if (matchingCount < requiredCount) {
          const propName = property.field.name || 'Unbekannte Eigenschaft';
          const message =
            minRequired === -1
              ? `Personeneigenschaften: Alle zugewiesenen Helfer benötigen '${propName}' (${matchingCount}/${requiredCount} erfüllt)`
              : `Personeneigenschaften: mind. ${minRequired} Helfer mit '${propName}' benötigt (aktuell: ${matchingCount})`;
          warnings.push(message);
        }
      }
    }
    if (warnings.length > 0) {
      const confirmed = await showDialog({
        title: 'Warnung: Kriterien nicht erfüllt',
        description:
          'Folgende Kriterien sind nicht erfüllt:\n\n' +
          warnings.map((w) => `• ${w}`).join('\n') +
          '\n\nTrotzdem speichern?',
        confirmText: 'Trotzdem speichern',
        cancelText: 'Abbrechen',
        variant: 'destructive',
      });

      if (confirmed !== 'success') {
        return;
      }
    }

    const startDateFull = new Date(staticFormData.startDate);
    const endDateFull = new Date(staticFormData.endDate);

    if (!staticFormData.all_day) {
      const [startHours = 0, startMinutes = 0] = staticFormData.startTime
        .split(':')
        .map(Number);
      const [endHours = 0, endMinutes = 0] = staticFormData.endTime
        .split(':')
        .map(Number);

      if (
        startHours < StartHour ||
        startHours > EndHour ||
        endHours < StartHour ||
        endHours > EndHour
      ) {
        setErrors({
          fieldErrors: {
            startTime: [
              `Zeit muss zwischen ${StartHour}:00 und ${EndHour}:00 liegen`,
            ],
            endTime: [
              `Zeit muss zwischen ${StartHour}:00 und ${EndHour}:00 liegen`,
            ],
          },
          formErrors: [],
        });
        return;
      }

      startDateFull.setHours(startHours, startMinutes, 0);
      endDateFull.setHours(endHours, endMinutes, 0);
    } else {
      startDateFull.setHours(0, 0, 0, 0);
      endDateFull.setHours(23, 59, 59, 999);
    }

    // When vergeben (assigned >= needed), allow bestätigt if user checked it; otherwise offen
    const status =
      assignedUsers.length >= parsedDataStatic.data.helpersNeeded
        ? staticFormData.confirmAsBestätigt === true
          ? StatusValuePairs.vergeben_bestaetigt
          : StatusValuePairs.vergeben
        : StatusValuePairs.offen;

    // Hole dynamische Felder aus React Hook Form
    const dynamicFormValues = dynamicForm.getValues();
    const einsatzFields = Object.entries(dynamicFormValues).map(
      ([field_id, value]: [string, any]) => {
        return {
          field_id,
          value: mapTypeToStringValue(value),
        };
      }
    );

    const org_id = currentEinsatz?.org_id ?? activeOrgId;
    if (!org_id) {
      toast.error('Organisation konnte nicht zugeordnet werden.');
      return;
    }

    if (!currentUserId) {
      toast.error('Benutzerdaten konnten nicht zugeordnet werden.');
      return;
    }

    //region Activity Change Log
    const isNewEinsatz = !currentEinsatz?.id;

    const previousAssignedUsers =
      currentEinsatz && 'assigned_users' in currentEinsatz
        ? currentEinsatz.assigned_users || []
        : [];

    const currentAssignedUsers = assignedUsers;

    const changeTypeNames = detectChangeTypes(
      isNewEinsatz,
      previousAssignedUsers,
      currentAssignedUsers,
      currentUserId,
      status
    );
    const affectedUserId = getAffectedUserId(
      previousAssignedUsers,
      currentAssignedUsers
    );
    // Only log E-Bestaetigt when status was manually changed to bestätigt (not when it was already bestätigt)
    const previousStatusId =
      currentEinsatz && 'status_id' in currentEinsatz
        ? currentEinsatz.status_id
        : undefined;
    const statusJustChangedToBestaetigt =
      status === StatusValuePairs.vergeben_bestaetigt &&
      previousStatusId !== StatusValuePairs.vergeben_bestaetigt;
    // detectChangeTypes returns 'E-Bearbeitet' in the fallback; replace with E-Bestaetigt only when status just changed to bestätigt
    const activityTypeNames = statusJustChangedToBestaetigt
      ? changeTypeNames.map((t) => (t === 'E-Bearbeitet' ? 'E-Bestaetigt' : t))
      : changeTypeNames;

    for (const changeTypeName of activityTypeNames) {
      const effectiveAffectedUserId =
        changeTypeName === 'E-Erstellt' ? null : affectedUserId;
      if (currentEinsatz?.id && currentUserId) {
        createChangeLogAuto({
          einsatzId: currentEinsatz.id,
          userId: currentUserId,
          typeId: ChangeTypeIds[changeTypeName],
          affectedUserId: effectiveAffectedUserId,
        }).catch((error) => {
          toast.error('Failed to create activity log: ' + error);
        });
      }
    }
    const outgoingUserProperties = (
      parsedDataStatic.data.requiredUserProperties ?? []
    ).map((p) => ({
      user_property_id: String(p.user_property_id),
      is_required: !!p.is_required,
      min_matching_users:
        typeof p.min_matching_users === 'number'
          ? p.min_matching_users
          : p.min_matching_users == null
            ? null
            : Number(p.min_matching_users),
    }));
    //endregion

    onSave({
      id: currentEinsatz?.id,
      title: parsedDataStatic.data.title,
      start: startDateFull,
      end: endDateFull,
      all_day: parsedDataStatic.data.all_day,
      participant_count: parsedDataStatic.data.participantCount ?? null,
      price_per_person: parsedDataStatic.data.pricePerPerson ?? null,
      total_price: parsedDataStatic.data.totalPrice ?? null,
      org_id,
      status_id: status,
      created_by: currentUserId,
      template_id: activeTemplateId ?? undefined,
      helpers_needed: parsedDataStatic.data.helpersNeeded,
      categories: parsedDataStatic.data.einsatzCategoriesIds ?? [],
      assignedUsers: assignedUsers,
      einsatz_fields: einsatzFields,
      userProperties: outgoingUserProperties,
      anmerkung: parsedDataStatic.data.anmerkung ?? undefined,
    });
  };

  // const handleDelete = async () => {
  //   if (currentEinsatz?.id) {
  //     const result = await showDialog({
  //       title: einsatz_singular + " löschen",
  //       description: `Sind Sie sicher, dass Sie "${staticFormData.title}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
  //     });

  //     if (result === "success") {
  //       onDelete(currentEinsatz.id, currentEinsatz.title);
  //     }
  //   }
  // };

  const activeTemplate = useMemo(() => {
    return templatesQuery.data?.find((t) => t.id === activeTemplateId);
  }, [templatesQuery.data, activeTemplateId]);

  return (
    <>
      {AlertDialogComponent}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-2rem)] flex-col overflow-x-hidden sm:max-w-220">
          <DialogHeader className="bg-background sticky top-0 z-10 shrink-0 border-b pb-4">
            <DialogTitle className="pr-8 wrap-break-word">
              {isLoading
                ? 'Laden...'
                : isFetching && !isLoading
                  ? `Aktualisiere '${staticFormData.title}'...`
                  : currentEinsatz?.id
                    ? `Bearbeite '${staticFormData.title}'`
                    : staticFormData.title
                      ? `Erstelle '${staticFormData.title}'`
                      : `Erstelle ${einsatz_singular}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {currentEinsatz?.id
                ? einsatz_singular + ' bearbeiten'
                : einsatz_singular + ' anlegen'}
            </DialogDescription>
          </DialogHeader>

          {/* Display form-level errors */}
          {errors.formErrors.length > 0 && (
            <div className="bg-destructive/15 text-destructive shrink-0 rounded-md px-3 py-2 text-sm">
              <ul className="list-inside list-disc">
                {errors.formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="grid gap-8 py-4">
              {/* Template selection: single grid for options, no nested FormGroup grid */}
              {templatesQuery.isLoading ? (
                <div>Lade Vorlagen ...</div>
              ) : !activeTemplateId ? (
                <FormInputFieldCustom name="Vorlage auswählen" errors={[]}>
                  <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-4">
                    {templatesQuery.data
                      ?.filter((t) => t && !t.is_paused)
                      .map((t) => (
                        <ToggleItemBig
                          key={t.id}
                          text={t.name ?? 'Vorlage'}
                          description={t.description ?? ''}
                          iconUrl={t.template_icon.icon_url.trim()}
                          onClick={() => {
                            handleTemplateSelect(t.id);
                          }}
                        />
                      ))}
                  </div>
                </FormInputFieldCustom>
              ) : (
                <FormGroup>
                  <div className="flex flex-col justify-start gap-2 sm:flex-row sm:justify-between">
                    <div className="min-w-0 wrap-break-word">
                      Aktive Vorlage: {activeTemplate?.name}
                      {activeTemplate?.is_paused && ' (pausiert)'}
                    </div>
                    <Select
                      value={activeTemplateId}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger className="w-full sm:w-auto">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <div className="truncate">Aktive Vorlage ändern</div>
                        </Button>
                      </SelectTrigger>
                      <SelectContent>
                        {templatesQuery.data
                          ?.filter(
                            (t) => !t.is_paused || t.id === activeTemplateId
                          )
                          .map((t) => (
                            <SelectItem
                              key={t.id}
                              value={t.id}
                              disabled={t.is_paused}
                            >
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormGroup>
              )}
              {/* Form Fields */}
              <DefaultFormFields
                formData={staticFormData}
                onFormDataChange={handleFormDataChange}
                errors={errors}
                categoriesOptions={
                  categoriesQuery?.data
                    ? categoriesQuery?.data?.map((cat) => ({
                        value: cat.id,
                        label: cat.value,
                      }))
                    : []
                }
                usersOptions={
                  usersQuery?.data
                    ? usersQuery.data.map((user) => ({
                        value: user.id,
                        label: user.firstname + ' ' + user.lastname,
                      }))
                    : []
                }
                activeOrg={
                  organizations?.find((org) => org.id === activeOrgId) ?? null
                }
              />
              <DynamicFormFields
                fields={dynamicFormFields}
                control={dynamicForm.control}
                errors={dynamicForm.formState.errors}
              />

              <Separator />

              <RequiredUserProperties
                formData={staticFormData}
                onFormDataChange={handleFormDataChange}
                availableProps={
                  availableProps?.filter((prop) => prop.field.name !== null) as
                    | { id: string; field: { name: string } }[]
                    | undefined
                }
              />

              <div className="border-b"></div>
              <EinsatzActivityLog einsatzId={currentEinsatz?.id ?? null} />
            </div>
          </div>

          <DialogFooter className="bg-background sticky bottom-0 z-10 shrink-0 flex-row border-t pt-4 sm:justify-between">
            {
              <TooltipCustom text={einsatz_singular + ' löschen'}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    handleDelete(
                      einsatz_singular,
                      {
                        id: currentEinsatz?.id,
                        title:
                          currentEinsatz?.title ??
                          staticFormData.title ??
                          einsatz_singular,
                      },
                      showDialog,
                      onDelete
                    )
                  }
                  aria-label={einsatz_singular + ' löschen'}
                >
                  <RiDeleteBinLine size={16} aria-hidden="true" />
                </Button>
              </TooltipCustom>
            }
            <TooltipCustom text="PDF-Bestätigung drucken">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  handlePdfGenerate(
                    einsatz_singular,
                    {
                      id: currentEinsatz?.id,
                      title: currentEinsatz?.title ?? staticFormData.title,
                    },
                    generatePdf
                  )
                }
                aria-label="PDF-Bestätigung drucken"
              >
                <FileDown size={16} aria-hidden="true" />
              </Button>
            </TooltipCustom>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-4">
              {staticFormData.helpersNeeded > 0 &&
                staticFormData.assignedUsers.length >=
                  staticFormData.helpersNeeded && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="confirmAsBestätigt"
                      checked={staticFormData.confirmAsBestätigt === true}
                      onCheckedChange={(checked) =>
                        handleFormDataChange({
                          confirmAsBestätigt: checked === true,
                        })
                      }
                      aria-label="Als bestätigt markieren"
                    />
                    <label
                      htmlFor="confirmAsBestätigt"
                      className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Als bestätigt markieren
                    </label>
                  </div>
                )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave}>Speichern</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
