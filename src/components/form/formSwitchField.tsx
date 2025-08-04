import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import * as SwitchPrimitive from "@radix-ui/react-switch";

type FormFieldProps = {
  name: string;
} & React.ComponentProps<typeof SwitchPrimitive.Root>;

export default function FormSwitchField({ name, ...props }: FormFieldProps) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className="*:not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Switch id={sanitizedId} {...props} />
    </div>
  );
}
