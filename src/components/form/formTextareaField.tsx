import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormFieldProps = {
  name: string;
};

export default function FormTextareaField({
  name,
  ...props
}: FormFieldProps & React.ComponentProps<"textarea">) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className="*:not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Textarea id={sanitizedId} {...props} />
    </div>
  );
}
