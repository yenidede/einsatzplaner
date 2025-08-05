import React, { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import ErrorDisplay from "./errorDisplay";
import { cn } from "@/lib/utils";

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
        <div
          className={cn(
            "mt-1.5",
            errors.length > 0 &&
              "border-destructive ring-destructive/20 dark:ring-destructive/40"
          )}
        >
          {children}
        </div>
      </Label>
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
