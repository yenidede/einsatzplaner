'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { buildInputProps } from '../form/utils';
import TooltipCustom from '../tooltip-custom';

import { usePdfGenerator } from '@/features/pdf/hooks/usePdfGenerator';
import { useSession } from 'next-auth/react';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { toast } from 'sonner';
import { createChangeLogAuto } from '@/features/activity_log/activity_log-dal';

import {
  detectChangeTypes,
  getAffectedUserId,
} from '@/features/activity_log/utils';
import { Select, SelectContent, SelectItem } from '../ui/select';
import { SelectTrigger } from '@radix-ui/react-select';
import { EinsatzActivityLog } from '@/features/activity_log/components/ActivityLogWrapperEinsatzDialog';
import { UserPropertyValue } from '@/features/user_properties/user_property-dal';

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
};

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
          min_matching_users: z.number().int().min(0).nullable(),
        })
      )
      .optional(),
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
  einsatz: EinsatzCreate | string | null;
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
  const { data: availableProps } = useUserProperties(activeOrgId);

  const [errors, setErrors] = useState<{
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  }>({
    fieldErrors: {},
    formErrors: [],
  });

  // Fetch detailed einsatz data when einsatz is a string (UUID)
  const { data: detailedEinsatz, isLoading } = useDetailedEinsatz(
    typeof einsatz === 'string' ? einsatz : null,
    isOpen
  );

  const categoriesQuery = useCategories(activeOrgId);

  const templatesQuery = useTemplates(activeOrgId);

  const usersQuery = useUsers(activeOrgId);

  const { data: organizations } = useOrganizations(session?.user.orgIds);

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
        nextFormData = { ...prev, ...updates };
        return nextFormData;
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
    []
  );

  const resetForm = useCallback(() => {
    handleFormDataChange(DEFAULTFORMDATA);
    setActiveTemplateId(null);
    setErrors({
      fieldErrors: {},
      formErrors: [],
    });
  }, [handleFormDataChange]);

  useEffect(() => {
    if (currentEinsatz && typeof currentEinsatz === 'object') {
      // Create new (EinsatzCreate)
      if (!currentEinsatz.id) {
        const createEinsatz = currentEinsatz as EinsatzCreate;
        setActiveTemplateId(createEinsatz.template_id || null);
        handleFormDataChange({ title: createEinsatz.title || '' });
        if (createEinsatz.start) {
          const start = createEinsatz.start;
          handleFormDataChange({
            startDate: start,
            startTime: formatTimeForInput(start),
          });
        }
        if (createEinsatz.end) {
          const end = createEinsatz.end;
          handleFormDataChange({
            endDate: end,
            endTime: formatTimeForInput(end),
          });
        }
        handleFormDataChange({
          title: createEinsatz.title || '',
          all_day: createEinsatz.all_day || false,
        });
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
            formatTimeForInput(einsatzDetailed.start) ||
            DefaultStartHour + ':00',
          endDate: einsatzDetailed.end || new Date(),
          endTime:
            formatTimeForInput(einsatzDetailed.end) || DefaultEndHour + ':00',
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
  }, [currentEinsatz, handleFormDataChange, resetForm, isOpen]);

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
            defaultValue: f.field.default_value,
            required: f.field.is_required,
            isMultiline: f.field.is_multiline,
            min: f.field.min,
            max: f.field.max,
            allowedValues: f.field.allowed_values,
            inputType: mapDbDataTypeToFormFieldType(f.field?.type?.datatype),
            dataType: (f.field.type?.datatype as SupportedDataTypes) || 'text',
            inputProps: buildInputProps(f.field.type?.datatype, {
              placeholder: f.field.placeholder,
              min: f.field.min,
              max: f.field.max,
            }) as InputHTMLAttributes<HTMLInputElement>,
          }))
        );

        // Populate React Hook Form with field values
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

        // Reset form with new values
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
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
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
        // User cancelled, do not load template
        return;
      }
    }

    setActiveTemplateId(templateId);

    // Load template data and populate form
    if (selectedTemplate) {
      // Populate form with template data
      const templateUpdates: Partial<EinsatzFormData> = {};

      // Set default values from template if available
      if (selectedTemplate.participant_count_default !== null) {
        templateUpdates.participantCount =
          selectedTemplate.participant_count_default;
      }
      if (selectedTemplate.price_person_default !== null) {
        templateUpdates.pricePerPerson = selectedTemplate.price_person_default;
      }
      if (selectedTemplate.helpers_needed_default !== null) {
        templateUpdates.helpersNeeded = selectedTemplate.helpers_needed_default;
      }
      if (selectedTemplate.all_day_default !== null) {
        templateUpdates.all_day = selectedTemplate.all_day_default;
      }

      // Calculate total price after both participant count and price per person are set
      const finalParticipantCount =
        templateUpdates.participantCount ??
        staticFormData.participantCount ??
        DEFAULTFORMDATA.participantCount;
      const finalPricePerPerson =
        templateUpdates.pricePerPerson ??
        staticFormData.pricePerPerson ??
        DEFAULTFORMDATA.pricePerPerson;

      templateUpdates.totalPrice = finalParticipantCount * finalPricePerPerson;

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
      if (
        ratio >
        organizations?.find((o) => o.id === activeOrgId)
          ?.max_participants_per_helper!
      ) {
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
      parsedDataStatic.data.requiredUserProperties.length > 0 &&
      parsedDataStatic.data.assignedUsers.length > 0
    ) {
      const assignedUserDetails = usersQuery.data?.filter((user) =>
        parsedDataStatic.data.assignedUsers.includes(user.id)
      );

      for (const propConfig of parsedDataStatic.data.requiredUserProperties) {
        if (!propConfig.is_required) continue;

        const property = availableProps?.find(
          (p) => p.id === propConfig.user_property_id
        );
        if (!property) continue;

        const usersWithProperty = assignedUserDetails?.filter((user) => {
          const userPropValue = user.user_property_value?.find(
            (upv: UserPropertyValue) =>
              upv.user_property_id === propConfig.user_property_id
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

        if (matchingCount < minRequired) {
          const propName = property.field.name || 'Unbekannte Eigenschaft';
          warnings.push(
            `Personeneigenschaften: mind. ${minRequired} Helfer mit '${propName}' benötigt (aktuell: ${matchingCount})`
          );
        }
      }
    }

    // Show warning dialog if there are any warnings
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

    // If einsatz was changed, always remove bestätigt status
    const status =
      parsedDataStatic.data.assignedUsers.length >=
      parsedDataStatic.data.helpersNeeded
        ? StatusValuePairs.vergeben
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

    const currentAssignedUsers = parsedDataStatic.data.assignedUsers;

    const changeTypeNames = detectChangeTypes(
      isNewEinsatz,
      previousAssignedUsers,
      currentAssignedUsers,
      currentUserId
    );
    const affectedUserId = getAffectedUserId(
      previousAssignedUsers,
      currentAssignedUsers
    );

    console.log(
      'Detected change types for activity log:',
      changeTypeNames,
      isNewEinsatz,
      currentAssignedUsers
    );
    for (const changeTypeName of changeTypeNames) {
      const effectiveAffectedUserId =
        changeTypeName === 'create' ? null : affectedUserId;
      if (currentEinsatz?.id && currentUserId) {
        createChangeLogAuto({
          einsatzId: currentEinsatz.id,
          userId: currentUserId,
          typeName: changeTypeName,
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
      assignedUsers: parsedDataStatic.data.assignedUsers,
      einsatz_fields: einsatzFields,
      userProperties: outgoingUserProperties,
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

  return (
    <>
      {AlertDialogComponent}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-220 flex-col">
          <DialogHeader className="sticky top-0 z-10 shrink-0 border-b pb-4">
            <DialogTitle>
              {isLoading
                ? 'Laden...'
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

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-8 py-4">
              <FormGroup>
                {templatesQuery.isLoading ? (
                  <div>Lade Vorlagen ...</div>
                ) : !activeTemplateId ? (
                  // template not yet set, show options
                  <FormInputFieldCustom name="Vorlage auswählen" errors={[]}>
                    <div className="mt-1.5 flex flex-wrap gap-4">
                      {templatesQuery.data?.map((t) => (
                        <ToggleItemBig
                          key={t.id}
                          text={t.name ?? 'Vorlage'}
                          description={t.description ?? ''}
                          iconUrl={t.template_icon.icon_url.trim()}
                          onClick={() => {
                            handleTemplateSelect(t.id);
                          }}
                          className="w-full sm:w-auto"
                        />
                      ))}
                    </div>
                  </FormInputFieldCustom>
                ) : (
                  <div className="flex justify-between">
                    <div>
                      Aktive Vorlage:{' '}
                      {
                        templatesQuery.data?.find(
                          (t) => t.id === activeTemplateId
                        )?.name
                      }
                    </div>
                    <Select
                      value={activeTemplateId}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger>
                        <Button asChild variant="outline">
                          <div>Aktive Vorlage ändern</div>
                        </Button>
                      </SelectTrigger>
                      <SelectContent>
                        {templatesQuery.data?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </FormGroup>
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
                availableProps={
                  availableProps?.filter((prop) => prop.field.name !== null) as
                    | { id: string; field: { name: string } }[]
                    | undefined
                }
              />

              <DynamicFormFields
                fields={dynamicFormFields}
                control={dynamicForm.control}
                errors={dynamicForm.formState.errors}
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
            <div className="flex flex-1 justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button onClick={handleSave}>Speichern</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
