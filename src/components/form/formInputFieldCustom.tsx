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
    <div className={className}>
      <Label htmlFor={sanitizedId}>
        {name}
        <div className="mt-1.5"> {children}</div>
      </Label>
    </div>
  );
}
