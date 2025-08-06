"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RiDeleteBinLine } from "@remixicon/react";
import { isBefore } from "date-fns";

import z from "zod";
import { generateDynamicSchema, mapDbDataTypeToFormFieldType } from "./utils";

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
import type {
  einsatz as Einsatz,
  organization as Organization,
} from "@/generated/prisma";
import { useQuery } from "@tanstack/react-query";
import { EinsatzCreate, EinsatzDetailed } from "@/features/einsatz/types";
import FormGroup from "../form/formGroup";
import FormInputFieldCustom from "../form/formInputFieldCustom";
import ToggleItemBig from "../form/toggle-item-big";
import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getAllTemplatesWithIconByOrgId } from "@/features/template/template-dal";
import { getAllUsersWithRolesByOrgId } from "@/features/user/user-dal";
import { DefaultFormFields } from "@/components/event-calendar/defaultFormFields";
import { useAlertDialog } from "@/contexts/AlertDialogContext";
import { CustomFormField, FormFieldType } from "./types";
import DynamicFormFields from "./dynamicFormfields";
import { randomUUID } from "crypto";

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
    einsatzCategoriesIds: z.array(z.uuid()).optional(),
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

// Helper function to get user-friendly field names
function getFieldDisplayName(fieldName: string): string {
  const fieldNames: Record<string, string> = {
    title: "Titel",
    einsatzCategoriesIds: "Kategorien",
    startDate: "Startdatum",
    endDate: "Enddatum",
    startTime: "Startzeit",
    endTime: "Endzeit",
    all_day: "Ganztägig",
    participantCount: "Teilnehmeranzahl",
    pricePerPerson: "Preis pro Person",
    helpersNeeded: "Helfer benötigt",
    assignedUsers: "Zugewiesene Benutzer",
  };

  return fieldNames[fieldName] || fieldName;
}

interface EventDialogProps {
  einsatz: EinsatzCreate | string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (einsatz: EinsatzCreate) => void;
  onDelete: (eventId: string) => void;
  activeOrg: Organization | null;
}

export function EventDialog({
  einsatz,
  isOpen,
  activeOrg,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  const { showDialog } = useAlertDialog();

  // TODO
  const activeOrgId = "0c39989e-07bc-4074-92bc-aa274e5f22d0"; // remove this!!!
  const currentUserId = "5ae139a7-476c-4d76-95cb-4dcb4e909da9";
  // TODO
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const [staticFormData, setStaticFormData] =
    useState<EinsatzFormData>(DEFAULTFORMDATA);
  // state for validation on dynamic form data - generated once after template was selected
  const [dynamicSchema, setDynamicSchema] = useState<z.ZodObject<any> | null>(
    null
  );
  // used for rendering of dynamic form fields
  const [dynamicFormFields, setDynamicFormFields] = useState<CustomFormField[]>(
    [
      {
        id: "kostenaufwand",
        displayName: "Kostenaufwand",
        placeholder: "Geben Sie den Kostenaufwand ein",
        defaultValue: 12.2,
        required: true,
        groupName: "Finanzen",
        min: 0,
        type: "default",
        inputProps: { type: "number", step: "0.10" },
      },
    ]
  );
  // stores the dynamic form data in key-value pairs
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({
    kostenaufwand: 12.2,
  });

  const [errors, setErrors] = useState<{
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  }>({
    fieldErrors: {},
    formErrors: [],
  });

  // Fetch detailed einsatz data when einsatz is a string (ID)
  const {
    data: detailedEinsatz,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["einsatz", einsatz],
    queryFn: () => {
      return getEinsatzWithDetailsById(einsatz as string);
    },
    enabled: typeof einsatz === "string" && !!einsatz && isOpen,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", activeOrg?.id ?? activeOrgId],
    queryFn: () => getCategoriesByOrgIds([activeOrg?.id ?? activeOrgId]),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates", activeOrg?.id ?? activeOrgId],
    queryFn: () => getAllTemplatesWithIconByOrgId(activeOrg?.id ?? activeOrgId),
  });

  const usersQuery = useQuery({
    queryKey: ["users", activeOrg?.id ?? activeOrgId, "helpers"],
    queryFn: () => {
      return getAllUsersWithRolesByOrgId(activeOrg?.id ?? activeOrgId);
    },
  });

  // type string means einsatz (enter exit mode)
  const currentEinsatz =
    typeof einsatz === "string" ? detailedEinsatz : einsatz;

  const handleDynamicFormDataChange = (
    updates: Partial<z.infer<typeof dynamicSchema>>
  ) => {
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
      console.warn("No dynamic schema available for validation");
    }

    setDynamicFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleFormDataChange = (updates: Partial<EinsatzFormData>) => {
    const updatedFormData = { ...staticFormData, ...updates };

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
            newErrors.fieldErrors[field] = fieldErrors;
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

    // Also run full validation for relationship checks (like date/time dependencies)
    const fullResult = ZodEinsatzFormData.safeParse(updatedFormData);

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

    setStaticFormData((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (currentEinsatz && typeof currentEinsatz === "object") {
      // Create new (EinsatzCreate)
      if (!currentEinsatz.id) {
        const createEinsatz = currentEinsatz as EinsatzCreate;
        handleFormDataChange({ title: createEinsatz.title || "" });

        // Safely handle start and end dates
        if (createEinsatz.start) {
          const start = new Date(createEinsatz.start);
          handleFormDataChange({
            startDate: start,
            startTime: formatTimeForInput(start),
          });
        }

        if (createEinsatz.end) {
          const end = new Date(createEinsatz.end);
          handleFormDataChange({
            endDate: end,
            endTime: formatTimeForInput(end),
          });
        }

        handleFormDataChange({
          all_day: createEinsatz.all_day || false,
        });
        // Reset errors when opening dialog
        setErrors({
          fieldErrors: {},
          formErrors: [],
        });
      } else {
        // Edit existing einsatz (loaded from query)
        setActiveTemplateId(currentEinsatz.template_id || null);
        handleFormDataChange({ title: currentEinsatz.title || "" });

        // Safely handle start and end dates
        if (currentEinsatz.start) {
          const start = new Date(currentEinsatz.start);
          handleFormDataChange({
            startDate: start,
            startTime: formatTimeForInput(start),
          });
        }

        if (currentEinsatz.end) {
          const end = new Date(currentEinsatz.end);
          handleFormDataChange({
            endDate: end,
            endTime: formatTimeForInput(end),
          });
        }

        handleFormDataChange({
          all_day: currentEinsatz.all_day || false,
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
  }, [currentEinsatz]);

  // Generate the dynamic schema whenever templatesQuery.data is fetched
  useEffect(() => {
    if (templatesQuery.data) {
      const fields =
        templatesQuery.data.find((t) => t.id === activeTemplateId)
          ?.template_field || [];
      try {
        const mappedFields = fields.map((f) => {
          return {
            fieldId: f.field.id,
            type: f.field.type?.datatype,
            options: {
              isMultiline: f.field.is_multiline,
              isRequired: f.field.is_required,
              min: f.field.min,
              max: f.field.max,
              allowedValues: f.field.allowed_values,
            },
          };
        });
        const schema = generateDynamicSchema(mappedFields);
        setDynamicSchema(schema);
        setDynamicFormFields(
          fields.map((f) => {
            return {
              id: f.field.id,
              displayName: f.field.name || f.field.id,
              placeholder: f.field.placeholder,
              defaultValue: f.field.default_value,
              required: f.field.is_required,
              isMultiline: f.field.is_multiline,
              min: f.field.min,
              max: f.field.max,
              allowedValues: f.field.allowed_values,
              type: mapDbDataTypeToFormFieldType(f.field?.type?.datatype),
              inputProps:
                f.field.type?.datatype === "number" ? { type: "number" } : {},
            };
          })
        );
        setDynamicFormData(
          fields.reduce((acc, f) => {
            acc[f.field.id] = f.field.default_value;
            return acc;
          }, {} as Record<string, any>)
        );
      } catch (error) {
        console.error("Error generating schema:", error);
      }
    }
  }, [activeTemplateId, templatesQuery.data]);

  const resetForm = () => {
    handleFormDataChange(DEFAULTFORMDATA);
    setActiveTemplateId(null);
    setErrors({
      fieldErrors: {},
      formErrors: [],
    });
  };

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

  const handleSave = () => {
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
              `Selected time must be between ${StartHour}:00 and ${EndHour}:00`,
            ],
            endTime: [
              `Selected time must be between ${StartHour}:00 and ${EndHour}:00`,
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

    // Validate that end date is not before start date
    if (isBefore(endDateFull, startDateFull)) {
      setErrors({
        fieldErrors: {
          endDate: ["End date cannot be before start date"],
        },
        formErrors: [],
      });
      return;
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
          value: value,
        };
      }
    );

    onSave({
      id: currentEinsatz?.id,
      title: parsedDataStatic.data.title,
      start: startDateFull,
      end: endDateFull,
      all_day: parsedDataStatic.data.all_day,
      participant_count: parsedDataStatic.data.participantCount ?? null,
      price_per_person: parsedDataStatic.data.pricePerPerson ?? null,
      total_price: parsedDataStatic.data.totalPrice ?? null,
      org_id: currentEinsatz?.org_id ?? activeOrg?.id ?? activeOrgId,
      status_id: status,
      created_by: currentUserId,
      template_id: activeTemplateId ?? undefined,
      helpers_needed: parsedDataStatic.data.helpersNeeded,
      categories: [],
      einsatz_fields: einsatzFields,
    });
  };

  const handleDelete = async () => {
    if (currentEinsatz?.id) {
      const result = await showDialog({
        title: "Einsatz löschen",
        description: `Sind Sie sicher, dass Sie den Einsatz "${staticFormData.title}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`,
      });

      if (result === "success") {
        onDelete(currentEinsatz.id);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[55rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0 sticky top-0 bg-background z-10 pb-4 border-b">
          <DialogTitle>
            {isLoading
              ? "Laden..."
              : currentEinsatz?.id
              ? "Bearbeite " + staticFormData.title
              : "Erstelle " + (activeOrg?.einsatz_name_singular ?? " Einsatz")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {currentEinsatz?.id
              ? "Edit the details of this einsatz"
              : "Add a new einsatz to your calendar"}
          </DialogDescription>
        </DialogHeader>

        {/* Display form-level errors */}
        {errors.formErrors.length > 0 && (
          <div className="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm flex-shrink-0">
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
                // option to switch template (TODO later)
                <div>
                  <span className="font-semibold">
                    {
                      templatesQuery.data?.find(
                        (t) => t.id === activeTemplateId
                      )?.name
                    }
                  </span>{" "}
                  ausgewählt.
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
              activeOrg={activeOrg}
            />
            <DynamicFormFields
              fields={dynamicFormFields}
              formData={dynamicFormData}
              errors={errors.fieldErrors}
              onFormDataChange={handleDynamicFormDataChange}
            />
          </div>
        </div>
        <DialogFooter className="flex-row sm:justify-between flex-shrink-0 sticky bottom-0 bg-background z-10 pt-4 border-t">
          {currentEinsatz?.id && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              aria-label="Einsatz löschen"
            >
              <RiDeleteBinLine size={16} aria-hidden="true" />
            </Button>
          )}
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
