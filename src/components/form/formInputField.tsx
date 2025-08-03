import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type FormFieldProps = {
  name: string;
};

export default function FormField({
  name,
  ...props
}: FormFieldProps & React.ComponentProps<"input">) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className="*:not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Input id={sanitizedId} {...props} />
    </div>
  );
}
