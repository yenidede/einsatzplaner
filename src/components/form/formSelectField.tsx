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
import { Button } from '@/components/ui/button';

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
  allowClear?: boolean;
  onResetUnavailableValue?: () => void;
  hideLabel?: boolean;
}

export default function FormSelectField({
  name,
  value,
  options,
  placeholder = 'Auswählen...',
  errors,
  onValueChange,
  allowClear = false,
  onResetUnavailableValue,
  hideLabel = false,
  ...props
}: FormSelectFieldProps &
  Omit<React.ComponentProps<typeof Select>, 'value' | 'onValueChange'>) {
  const sanitizedId = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  // Convert string array to Option array if needed
  const baseOptions: Option[] =
    options.length > 0 && typeof options[0] === 'string'
      ? (options as string[]).map((option) => ({
          value: option,
          label: option,
        }))
      : (options as Option[]);

  // empty string or null not currently possible with radix select https://github.com/radix-ui/primitives/issues/2706
  const normalizedOptions = allowClear
    ? [{ label: 'Keine Auswahl', value: '_null_' }, ...baseOptions]
    : baseOptions;
  const hasUnavailableValue =
    value != null &&
    value !== '' &&
    value !== '_null_' &&
    !baseOptions.some((option) => option.value === value);
  const optionsWithHistoricalValue = hasUnavailableValue
    ? [
        ...normalizedOptions,
        { label: `${value} (nicht mehr verfügbar)`, value, disabled: true },
      ]
    : normalizedOptions;

  return (
    <div>
      {!hideLabel && <Label htmlFor={sanitizedId}>{name}</Label>}
      <div className="mt-1.5">
        <Select value={value} onValueChange={onValueChange} {...props}>
          <SelectTrigger id={sanitizedId}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {optionsWithHistoricalValue.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={'disabled' in option && option.disabled}
                aria-invalid={errors.length > 0}
                className={
                  option.value === '_null_' ||
                  ('disabled' in option && option.disabled)
                    ? 'text-muted-foreground!'
                    : undefined
                }
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasUnavailableValue && onResetUnavailableValue && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>Diese Auswahl ist nicht mehr verfügbar.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetUnavailableValue}
          >
            Zurücksetzen
          </Button>
        </div>
      )}
      {errors.length > 0 && <ErrorDisplay errors={errors} />}
    </div>
  );
}
