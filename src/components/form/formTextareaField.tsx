import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ErrorDisplay from './errorDisplay';

type FormFieldProps = {
  name: string;
  errors: string[];
};

export default function FormTextareaField({
  name,
  errors,
  ...props
}: FormFieldProps & React.ComponentProps<'textarea'>) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return (
    <div>
      <Label htmlFor={sanitizedId}>{name}</Label>
      <Textarea
        className="mt-1.5"
        id={sanitizedId}
        aria-invalid={errors.length > 0}
        {...props}
      />
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
