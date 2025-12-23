"use client";

import { useCallback, useEffect, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { RiDeleteBinLine } from "@remixicon/react";
import { FileDown } from "lucide-react";

import z from "zod";
import {
  generateDynamicSchema,
  handleDelete,
  handlePdfGenerate,
  mapDbDataTypeToFormFieldType,
  mapFieldsForSchema,
  mapStringValueToType,
  mapTypeToStringValue,
} from "./utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DefaultEndHour,
  DefaultStartHour,
  EndHour,
  StartHour,
  StatusValuePairs,
} from "@/components/event-calendar/constants";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import { useQuery } from "@tanstack/react-query";
import { queryKeys as OrgaQueryKeys } from "@/features/organization/queryKeys";
import { queryKeys as TemplateQueryKeys } from "@/features/einsatztemplate/queryKeys";
import { queryKeys as UserQueryKeys } from "@/features/user/queryKeys";
import { EinsatzCreate, EinsatzDetailed } from "@/features/einsatz/types";
import FormGroup from "../form/formGroup";
import FormInputFieldCustom from "../form/formInputFieldCustom";
import ToggleItemBig from "../form/toggle-item-big";
import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getAllTemplatesWithIconByOrgId } from "@/features/template/template-dal";
import { getAllUsersWithRolesByOrgId } from "@/features/user/user-dal";
import { DefaultFormFields } from "@/components/event-calendar/defaultFormFields";
import { useAlertDialog } from "@/contexts/AlertDialogContext";
import { CustomFormField, SupportedDataTypes } from "./types";
import DynamicFormFields from "./dynamicFormfields";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { buildInputProps } from "../form/utils";
import TooltipCustom from "../tooltip-custom";

import { usePdfGenerator } from "@/features/pdf/hooks/usePdfGenerator";
import { useSession } from "next-auth/react";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { toast } from "sonner";
import { createChangeLogAuto } from "@/features/activity_log/activity_log-dal";

import {
  detectChangeTypes,
  getAffectedUserId,
} from "@/features/activity_log/utils";
import { Select, SelectContent, SelectItem } from "../ui/select";
import { SelectTrigger } from "@radix-ui/react-select";
import { EinsatzActivityLog } from "@/features/activity_log/components/ActivityLogWrapperEinsatzDialog";
// Defaults for the defaultFormFields (no template loaded yet)
const DEFAULTFORMDATA: EinsatzFormData = {
  title: "",
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
};

export const ZodEinsatzFormData = z
  .object({
    title: z.string().min(1, "Titel ist erforderlich"),
    einsatzCategoriesIds: z.array(z.uuid()),
    startDate: z.date(),
    endDate: z.date(),
    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Invalid time format. Must be in HH:MM (24-hour) format."
      ),
    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Invalid time format. Must be in HH:MM (24-hour) format."
      ),
    all_day: z.boolean(),
    participantCount: z
      .number()
      .min(0, "Teilnehmeranzahl darf nicht negativ sein"),
    pricePerPerson: z.number().min(0, "Preis darf nicht negativ sein"),
    totalPrice: z.number().min(0, "Gesamtpreis darf nicht negativ sein"),
    helpersNeeded: z.number().min(-1, "Helfer-Anzahl muss 0 oder größer sein"),
    assignedUsers: z.array(z.uuid()),
  })
  .refine(
    (data) => {
      // Ensure end date is not before start date
      if (!data.all_day) {
        // For timed events, compare the full date-time
        const startDateTime = new Date(data.startDate);
        const endDateTime = new Date(data.endDate);

        const [startHours, startMinutes] = data.startTime
          .split(":")
          .map(Number);
        const [endHours, endMinutes] = data.endTime.split(":").map(Number);

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
      message: "Enddatum/zeit muss nach Startdatum/zeit liegen",
      path: ["endDate"],
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
        "Gesamtpreis stimmt nicht mit Teilnehmern und Preis pro Person überein",
      path: ["totalPrice"],
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
        "Anzahl zugewiesener Personen darf die benötigten Helfer nicht überschreiten",
      path: ["assignedUsers"],
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
  const { showDialog } = useAlertDialog();
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
  // stores the dynamic form data in key-value pairs
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>(
    {}
  );

  const [errors, setErrors] = useState<{
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  }>({
    fieldErrors: {},
    formErrors: [],
  });

  // Fetch detailed einsatz data when einsatz is a string (UUID)
  const { data: detailedEinsatz, isLoading } = useQuery({
    // only enabled if it's a string (uuid)
    queryKey: einsatzQueryKeys.detailedEinsatz(einsatz as string),
    queryFn: async () => {
      const res = await getEinsatzWithDetailsById(einsatz as string);
      if (!(res instanceof Response)) return res;
      toast.error("Failed to fetch einsatz details: " + res.statusText);
    },
    enabled: typeof einsatz === "string" && !!einsatz && isOpen,
  });

  const categoriesQuery = useQuery({
    queryKey: einsatzQueryKeys.categories(activeOrgId ?? ""),
    queryFn: () => getCategoriesByOrgIds(activeOrgId ? [activeOrgId] : []),
    enabled: !!activeOrgId,
  });

  const templatesQuery = useQuery({
    queryKey: TemplateQueryKeys.templates(activeOrgId ? [activeOrgId] : []),
    queryFn: () => getAllTemplatesWithIconByOrgId(activeOrgId ?? ""),
    enabled: !!activeOrgId,
  });

  const usersQuery = useQuery({
    queryKey: UserQueryKeys.users(activeOrgId ?? ""),
    queryFn: () => {
      return getAllUsersWithRolesByOrgId(activeOrgId ?? "");
    },
    enabled: !!activeOrgId,
  });

  const { data: organizations } = useQuery({
    queryKey: OrgaQueryKeys.organizations(session?.user.orgIds ?? []),
    queryFn: () => getOrganizationsByIds(session?.user.orgIds ?? []),
    enabled: !!session?.user.orgIds?.length,
  });

  const einsatz_singular =
    organizations?.find((org) => org.id === activeOrgId)
      ?.einsatz_name_singular ?? "Einsatz";

  // type string means edit einsatz (uuid)
  const currentEinsatz =
    typeof einsatz === "string" ? detailedEinsatz : einsatz;

  const handleDynamicFormDataChange = (updates: Record<string, any>) => {
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === "string") {
        // Convert string values to appropriate types based on dynamic schema
        const fieldType = dynamicFormFields.find((f) => f.id === key)?.dataType;
        updates[key] = mapStringValueToType(value, fieldType);
      }
    });
    // Validate using dynamic schema if it exists
    if (dynamicSchema) {
      // Validate just the updated fields using partial schema
      const partialResult = dynamicSchema.partial().safeParse(updates);

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
    } else {
      toast.error(
        "'No dynamic schema available for validation.' Sollte der Fehler häufiger auftreten, wenden Sie sich an den Administrator."
      );
    }

    setDynamicFormData((prev) => ({ ...prev, ...updates }));
  };

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
          (issue) => issue.code === "custom" || issue.path.includes("endDate")
        );

        if (relationshipErrors.length > 0) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            fieldErrors: {
              ...prevErrors.fieldErrors,
              ...relationshipErrors.reduce((acc, error) => {
                const field = error.path[0] as string;
                acc[field] = [error.message];
                return acc;
              }, {} as Record<string, string[]>),
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
              (error) => error.includes("nach") || error.includes("Enddatum")
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
    if (currentEinsatz && typeof currentEinsatz === "object") {
      // Create new (EinsatzCreate)
      if (!currentEinsatz.id) {
        const createEinsatz = currentEinsatz as EinsatzCreate;
        setActiveTemplateId(createEinsatz.template_id || null);
        handleFormDataChange({ title: createEinsatz.title || "" });
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
          title: createEinsatz.title || "",
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
          title: einsatzDetailed.title || "",
          all_day: einsatzDetailed.all_day || false,
          startDate: einsatzDetailed.start || new Date(),
          startTime:
            formatTimeForInput(einsatzDetailed.start) ||
            DefaultStartHour + ":00",
          endDate: einsatzDetailed.end || new Date(),
          endTime:
            formatTimeForInput(einsatzDetailed.end) || DefaultEndHour + ":00",
          participantCount: einsatzDetailed.participant_count || 0,
          pricePerPerson: einsatzDetailed.price_per_person || 0,
          totalPrice: einsatzDetailed.total_price || 0,
          helpersNeeded: einsatzDetailed.helpers_needed || 0,
          assignedUsers: einsatzDetailed.assigned_users || [],
          einsatzCategoriesIds: einsatzDetailed.categories || [],
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
            dataType: (f.field.type?.datatype as SupportedDataTypes) || "text",
            inputProps: buildInputProps(f.field.type?.datatype, {
              placeholder: f.field.placeholder,
              min: f.field.min,
              max: f.field.max,
            }) as InputHTMLAttributes<HTMLInputElement>,
          }))
        );
        setDynamicFormData(
          fields.reduce((acc, f) => {
            const value =
              detailedEinsatz?.einsatz_fields?.find(
                (ef) => ef.field_id === f.field.id // load data from einsatz_field if exists,
              )?.value ?? f.field.default_value; //  else use default value
            acc[f.field.id] = mapStringValueToType(
              value,
              f.field.type?.datatype || "string"
            );
            return acc;
          }, {} as Record<string, any>)
        );
      } catch (error) {
        console.error("Error generating schema: " + error);
      }
    }
  }, [activeTemplateId, templatesQuery.data, detailedEinsatz?.einsatz_fields]);

  const formatTimeForInput = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
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
        title: `${selectedTemplate?.name || "Vorlage"} laden?`,
        description: `Ausgefüllte Felder werden möglicherweise Überschrieben.`,
      });

      if (dialogResult !== "success") {
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
    // Full validation before saving
    const parsedDataStatic = ZodEinsatzFormData.safeParse(staticFormData);
    //const parsedDataDynamic = dynamicSchema?.safeParse(dynamicFormData);

    if (!parsedDataStatic.success) {
      const flattenedErrors = z.flattenError(parsedDataStatic.error);
      setErrors({
        fieldErrors: flattenedErrors.fieldErrors,
        formErrors: flattenedErrors.formErrors || [],
      });
      return;
    }

    // Clear errors if validation passes
    setErrors({
      fieldErrors: {},
      formErrors: [],
    });

    const startDateFull = new Date(staticFormData.startDate);
    const endDateFull = new Date(staticFormData.endDate);

    if (!staticFormData.all_day) {
      const [startHours = 0, startMinutes = 0] = staticFormData.startTime
        .split(":")
        .map(Number);
      const [endHours = 0, endMinutes = 0] = staticFormData.endTime
        .split(":")
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

    const einsatzFields = Object.entries(dynamicFormData).map(
      ([field_id, value]: [string, any]) => {
        return {
          field_id,
          value: mapTypeToStringValue(value),
        };
      }
    );

    const org_id = currentEinsatz?.org_id ?? activeOrgId;
    if (!org_id) {
      toast.error("Organisation konnte nicht zugeordnet werden.");
      return;
    }

    if (!currentUserId) {
      toast.error("Benutzerdaten konnten nicht zugeordnet werden.");
      return;
    }

    //region Activity Change Log
    const isNewEinsatz = !currentEinsatz?.id;

    const previousAssignedUsers =
      currentEinsatz && "assigned_users" in currentEinsatz
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
      "Detected change types for activity log:",
      changeTypeNames,
      isNewEinsatz,
      currentAssignedUsers
    );
    for (const changeTypeName of changeTypeNames) {
      const effectiveAffectedUserId =
        changeTypeName === "create" ? null : affectedUserId;
      if (currentEinsatz?.id && currentUserId) {
        createChangeLogAuto({
          einsatzId: currentEinsatz.id,
          userId: currentUserId,
          typeName: changeTypeName,
          affectedUserId: effectiveAffectedUserId,
        }).catch((error) => {
          toast.error("Failed to create activity log: " + error);
        });
      }
    }

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-220 flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0 sticky top-0 bg-background z-10 pb-4 border-b">
          <DialogTitle>
            {isLoading
              ? "Laden..."
              : currentEinsatz?.id
              ? `Bearbeite '${staticFormData.title}'`
              : staticFormData.title
              ? `Erstelle '${staticFormData.title}'`
              : `Erstelle ${einsatz_singular}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {currentEinsatz?.id
              ? einsatz_singular + " bearbeiten"
              : einsatz_singular + " anlegen"}
          </DialogDescription>
        </DialogHeader>

        {/* Display form-level errors */}
        {errors.formErrors.length > 0 && (
          <div className="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm shrink-0">
            <ul className="list-disc list-inside">
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
                  <div className="flex flex-wrap gap-4 mt-1.5">
                    {templatesQuery.data?.map((t) => (
                      <ToggleItemBig
                        key={t.id}
                        text={t.name ?? "Vorlage"}
                        description={t.description ?? ""}
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
                    Aktive Vorlage:{" "}
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
                      label: user.firstname + " " + user.lastname,
                    }))
                  : []
              }
              activeOrg={
                organizations?.find((org) => org.id === activeOrgId) ?? null
              }
            />
            <DynamicFormFields
              fields={dynamicFormFields}
              formData={dynamicFormData}
              errors={errors.fieldErrors}
              onFormDataChange={handleDynamicFormDataChange}
            />
            <EinsatzActivityLog einsatzId={currentEinsatz?.id ?? null} />
          </div>
        </div>
        <DialogFooter className="flex-row sm:justify-between shrink-0 sticky bottom-0 bg-background z-10 pt-4 border-t">
          {
            <TooltipCustom text={einsatz_singular + " löschen"}>
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
                aria-label={einsatz_singular + " löschen"}
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
  );
}
