import React, { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import ErrorDisplay from "./errorDisplay";

type FormFieldProps = {
  name: string;
  className?: string;
  errors: string[];
  children: ReactNode;
};

export default function FormField({
  name,
  className,
  errors,
  children,
}: FormFieldProps) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className={className}>
      <Label htmlFor={sanitizedId}>
        {name}
        <div className="mt-1.5">{children}</div>
      </Label>
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
