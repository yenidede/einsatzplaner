import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import ErrorDisplay from './errorDisplay';

type FormFieldProps = {
  name: string;
  errors: string[];
} & React.ComponentProps<typeof SwitchPrimitive.Root>;

export default function FormSwitchField({
  name,
  errors,
  ...props
}: FormFieldProps) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Switch
        className="mt-1.5"
        id={sanitizedId}
        aria-invalid={errors.length > 0}
        {...props}
      />
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
