import React from "react";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/form/multi-select";
import type { MultiSelectProps } from "@/components/form/multi-select";

type MultiSelectFormFieldPropsExtended = {
  name: string;
} & MultiSelectProps;

export default function MultiSelectFormField({
  name,
  ...props
}: MultiSelectFormFieldPropsExtended) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

  return (
    <div className="*:not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <MultiSelect id={sanitizedId} animation={1} {...props} />
    </div>
  );
}
