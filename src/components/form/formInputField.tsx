import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type FormFieldProps = {
  name: string;
  errors: string[];
};

export default function FormField({
  name,
  errors,
  ...props
}: FormFieldProps & React.ComponentProps<"input">) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className="*:not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Input id={sanitizedId} {...props} />
      {errors && errors.length > 0 && (
        <div className="mt-1 text-red-500">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}
    </div>
  );
}
