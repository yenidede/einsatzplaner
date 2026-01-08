import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ErrorDisplay from './errorDisplay';
import { cn } from '@/lib/utils';

type FormFieldProps = {
  name: string;
  errors: string[];
};

export default function FormField({
  name,
  errors,
  className,
  ...props
}: FormFieldProps & React.ComponentProps<'input'>) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return (
    <div>
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Input
        aria-invalid={errors.length > 0}
        className={cn('mt-1.5', className)}
        id={sanitizedId}
        {...props}
      />
      {errors && errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
