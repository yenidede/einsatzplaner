import React, { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  name: string;
  value?: string;
};

export default function FormField({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: ReactNode;
}) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className={"*:not-first:mt-1.5 " + className}>
      <Label htmlFor={sanitizedId}>
        {name}
        {children}
      </Label>
    </div>
  );
}
