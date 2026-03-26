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
  const emitValidationChange = React.useEffectEvent(
    (error: string | null) => {
      onValidationChange?.(error);
    }
  );

  const validateValue = React.useCallback(
    (nextValue: string): { normalizedValue: string | null; error: string | null } => {
      const normalizedValue = normalizeTimeInput(nextValue);
      const isEmptyValue = normalizedValue === '';

      if (normalizedValue == null || (isEmptyValue && !allowEmpty)) {
        return {
          normalizedValue,
          error: invalidMessage,
        };
      }

      return {
        normalizedValue,
        error: null,
      };
    },
    [allowEmpty, invalidMessage]
  );

  React.useEffect(() => {
    setDraftValue(value);
    const validationResult = validateValue(value);
    setLocalError(validationResult.error);
    emitValidationChange(validationResult.error);
  }, [emitValidationChange, validateValue, value]);

  const commitValue = React.useCallback(() => {
    const validationResult = validateValue(draftValue);

    if (
      validationResult.error !== null ||
      validationResult.normalizedValue === null
    ) {
      setLocalError(validationResult.error);
      onValidationChange?.(validationResult.error);
      return;
    }

    setDraftValue(validationResult.normalizedValue);
    setLocalError(null);
    onValidationChange?.(null);

    if (validationResult.normalizedValue !== value) {
      onValueChange(validationResult.normalizedValue);
    }
  }, [draftValue, onValidationChange, onValueChange, validateValue, value]);

  return (
    <Input
      ref={ref}
      {...props}
      type="text"
      inputMode="numeric"
      data-time-input="true"
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
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
    />
  );
});
