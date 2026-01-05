"use client";

import SwitchIcon from "@/components/icon/SwitchIcon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UserPropertyWithField } from "@/features/user_properties/user_property-dal";

interface UserPersonalPropertiesProps {
  organizationName: string;
  hasKey: boolean;
  onToggleKey: () => void;
  description: string | null;
  userProperties: UserPropertyWithField[];
  propertyValues: Record<string, string>;
  onPropertyValueChange: (propertyId: string, value: string) => void;
}

export function UserPersonalProperties({
  organizationName,
  hasKey,
  onToggleKey,
  description,
  userProperties,
  propertyValues,
  onPropertyValueChange,
}: UserPersonalPropertiesProps) {
  const renderField = (property: UserPropertyWithField) => {
    const value =
      propertyValues[property.id] || property.field.default_value || "";
    const fieldType = property.field.type?.datatype;

    switch (fieldType) {
      case "text":
        if (property.field.is_multiline) {
          return (
            <Textarea
              value={value}
              onChange={(e) =>
                onPropertyValueChange(property.id, e.target.value)
              }
              placeholder={property.field.placeholder || ""}
              className="w-full min-h-20 px-3 py-2 bg-white rounded-md outline outline-offset-1 outline-slate-300 resize-none"
              maxLength={property.field.max || undefined}
            />
          );
        }
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => onPropertyValueChange(property.id, e.target.value)}
            placeholder={property.field.placeholder || ""}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-offset-1 outline-slate-300"
            maxLength={property.field.max || undefined}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onPropertyValueChange(property.id, e.target.value)}
            placeholder={property.field.placeholder || ""}
            className="w-full px-3 py-2 bg-white rounded-md outline  outline-offset-1 outline-slate-300"
            min={property.field.min || undefined}
            max={property.field.max || undefined}
          />
        );

      case "boolean":
        return (
          <button
            onClick={() => {
              const newValue = value === "true" ? "false" : "true";
              onPropertyValueChange(property.id, newValue);
            }}
            className="cursor-pointer disabled:opacity-50 transition-opacity bg-transparent border-0 p-0 outline-none focus:outline-none hover:bg-transparent"
          >
            <SwitchIcon isOn={value === "true"} disabled={false} />
          </button>
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => onPropertyValueChange(property.id, e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-md outline outline-offset-1 outline-slate-300"
          >
            <option value="">Bitte wählen...</option>
            {property.field.allowed_values.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-start items-center gap-2">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Personeneigenschaften
          </div>
          <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
            {organizationName}
          </div>
        </div>
      </div>
      <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
        {userProperties.map((property) => (
          <div
            key={property.id}
            className="self-stretch px-4 inline-flex justify-start items-start gap-4"
          >
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
              <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
                {property.field.name}
                {property.field.is_required && (
                  <span className="text-red-600 ml-1">*</span>
                )}
              </div>
              {renderField(property)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
