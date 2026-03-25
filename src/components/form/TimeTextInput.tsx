'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { normalizeTimeInput } from '@/lib/time-input';

type TimeTextInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> & {
  value: string;
  onValueChange: (value: string) => void;
  onValidationChange?: (error: string | null) => void;
  allowEmpty?: boolean;
  invalidMessage?: string;
};

export const TimeTextInput = React.forwardRef<
  HTMLInputElement,
  TimeTextInputProps
>(function TimeTextInput(
  {
    value,
    onValueChange,
    onValidationChange,
    allowEmpty = false,
    invalidMessage = 'Bitte geben Sie eine gültige Uhrzeit im Format HH:MM ein.',
    onBlur,
    onKeyDown,
    ...props
  },
  ref
) {
  const [draftValue, setDraftValue] = React.useState(value);
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const commitValue = React.useCallback(() => {
    const normalizedValue = normalizeTimeInput(draftValue);
    const isEmptyValue = normalizedValue === '';

    if (normalizedValue == null || (isEmptyValue && !allowEmpty)) {
      setLocalError(invalidMessage);
      onValidationChange?.(invalidMessage);
      return;
    }

    setDraftValue(normalizedValue);
    setLocalError(null);
    onValidationChange?.(null);

    if (normalizedValue !== value) {
      onValueChange(normalizedValue);
    }
  }, [
    allowEmpty,
    draftValue,
    invalidMessage,
    onValidationChange,
    onValueChange,
    value,
  ]);

  return (
    <Input
      ref={ref}
      {...props}
      type="text"
      inputMode="numeric"
      placeholder={props.placeholder ?? 'HH:MM'}
      value={draftValue}
      aria-invalid={
        props['aria-invalid'] === true || localError !== null || undefined
      }
      onChange={(event) => {
        setDraftValue(event.target.value);
        if (localError !== null) {
          setLocalError(null);
        }
        onValidationChange?.(null);
      }}
      onBlur={(event) => {
        commitValue();
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          commitValue();
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
    />
  );
});
