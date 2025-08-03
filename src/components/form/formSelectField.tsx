import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface FormSelectFieldProps {
  name: string;
  value?: string;
  options: Option[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
}

export default function FormSelectField({
  name,
  value,
  options,
  placeholder = "Auswählen...",
  onValueChange,
  ...props
}: FormSelectFieldProps &
  Omit<React.ComponentProps<typeof Select>, "value" | "onValueChange">) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();

  return (
    <div className="not-first:mt-1.5">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Select value={value} onValueChange={onValueChange} {...props}>
        <SelectTrigger id={sanitizedId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
