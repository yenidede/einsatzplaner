import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function FormField({
  name,
  value,
  ...props
}: {
  name: string;
  value: string | number | readonly string[] | undefined;
  props: HTMLInputElement;
}) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  return (
    <div className="*:not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>Name</Label>
      <Input id={sanitizedId} value={value} {...props} />
    </div>
  );
}
