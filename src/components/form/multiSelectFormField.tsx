import React from "react";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/form/multi-select";
import type { MultiSelectProps } from "@/components/form/multi-select";
import { Option } from "../form/formSelectField";
import ErrorDisplay from "./errorDisplay";

type MultiSelectFormFieldPropsExtended = {
  name: string;
  options: Option[] | string[];
  errors: string[];
} & Omit<MultiSelectProps, "options">;

export default function MultiSelectFormField({
  name,
  options,
  errors,
  ...props
}: MultiSelectFormFieldPropsExtended) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

  // Convert string array to Option array if needed
  const normalizedOptions: Option[] =
    options.length > 0 && typeof options[0] === "string"
      ? (options as string[]).map((option) => ({
          value: option.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
          label: option,
        }))
      : (options as Option[]);
  return (
    <div>
      <Label htmlFor={sanitizedId}>{name}</Label>
      <MultiSelect
        id={sanitizedId}
        animation={1}
        options={normalizedOptions}
        className="mt-1.5"
        aria-invalid={errors.length > 0}
        {...props}
      />
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
