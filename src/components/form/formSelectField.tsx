import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ErrorDisplay from './errorDisplay';

export interface Option {
  value: string;
  label: string;
}

interface FormSelectFieldProps {
  name: string;
  value?: string;
  options: Option[] | string[];
  placeholder?: string;
  errors: string[];
  onValueChange?: (value: string) => void;
}

export default function FormSelectField({
  name,
  value,
  options,
  placeholder = 'Auswählen...',
  errors,
  onValueChange,
  ...props
}: FormSelectFieldProps &
  Omit<React.ComponentProps<typeof Select>, 'value' | 'onValueChange'>) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  // Convert string array to Option array if needed
  const normalizedOptions: Option[] =
    options.length > 0 && typeof options[0] === 'string'
      ? (options as string[]).map((option) => ({
          value: option.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
          label: option,
        }))
      : (options as Option[]);

  return (
    <div>
      <Label htmlFor={sanitizedId}>{name}</Label>
      <div className="mt-1.5">
        <Select value={value} onValueChange={onValueChange} {...props}>
          <SelectTrigger id={sanitizedId}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {normalizedOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                aria-invalid={errors.length > 0}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
