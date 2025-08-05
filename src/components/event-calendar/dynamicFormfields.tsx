import React from "react";
import FormGroup from "../form/formGroup";
import FormInput from "../form/formInputField";
import FormSwitchField from "../form/formSwitchField";
import FormSelectField from "../form/formSelectField";
import { Option } from "../form/formSelectField";
import FormMultiSelectField from "../form/multiSelectFormField";
import { CustomFormField } from "./types";
import FormTextareaField from "../form/formTextareaField";

type DynamicFormFieldsProps = {
  fields: CustomFormField[];
  errors: Record<string, string[]>;
  formData?: Record<string, any>;
  onFormDataChange: (data: Record<string, any>) => void;
};

export default function DynamicFormFields({
  fields,
  formData,
  errors,
  onFormDataChange,
}: DynamicFormFieldsProps) {
  const handleFieldChange = (fieldId: string, value: any) => {
    onFormDataChange({ [fieldId]: value });
  };

  const renderField = (field: CustomFormField) => {
    switch (field.type) {
      case "checkbox":
        return (
          <FormSwitchField
            key={field.id}
            name={field.displayName}
            checked={formData?.[field.id] ?? false}
            onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            errors={errors[field.id] || []}
          />
        );
      case "select":
        return (
          <FormSelectField
            key={field.id}
            name={field.displayName}
            options={field.allowedValues ?? []}
            value={formData?.[field.id] ?? ""}
            placeholder={field.placeholder ?? "Feld auswählen..."}
            required={field.required}
            onValueChange={(value) => handleFieldChange(field.id, value)}
            errors={errors[field.id] || []}
          />
        );
      case "multi-select":
        return (
          <FormMultiSelectField
            key={field.id}
            name={field.displayName}
            options={field.allowedValues ?? ["(problem loading options)"]}
            onValueChange={(val) => {
              handleFieldChange(field.id, val);
            }}
            defaultValue={
              typeof field.defaultValue === "string"
                ? field.defaultValue.split(",").map((item) => item.trim())
                : field.defaultValue
            }
            aria-required={field.required}
            errors={errors[field.id] || []}
          />
        );
      case "textarea":
        return (
          <FormTextareaField
            key={field.id}
            name={field.displayName}
            placeholder={field.placeholder ?? ""}
            value={formData?.[field.id] ?? ""}
            required={field.required}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            errors={errors[field.id] || []}
          />
        );
      case "default":
        return (
          <FormInput
            key={field.id}
            name={field.displayName}
            placeholder={field.placeholder ?? undefined}
            value={formData?.[field.id] ?? ""}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            errors={errors[field.id] || []}
            {...field.inputProps}
          />
        );
      default:
        return null;
    }
  };

  // Group fields by groupName
  const groupedFields = fields.reduce((groups, field) => {
    const groupName = field.groupName || "Sonstiges"; // Default group name
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(field);
    return groups;
  }, {} as Record<string, CustomFormField[]>);

  return (
    <>
      {Object.entries(groupedFields).map(([groupName, groupFields]) => (
        <FormGroup key={groupName}>
          {/* Optional: Add group title */}
          {groupName !== "Sonstiges" && (
            <h3 className="text-lg font-medium mb-4">{groupName}</h3>
          )}
          {groupFields.map((field) => renderField(field))}
        </FormGroup>
      ))}
    </>
  );
}
