'use client';

import * as React from 'react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';

export interface InputWithCounterProps
  extends React.ComponentProps<typeof InputGroupInput> {
  currentLength: number;
  maxLength: number;
  errorMessage?: string;
}

export const InputWithCounter = React.forwardRef<
  React.ElementRef<typeof InputGroupInput>,
  InputWithCounterProps
>(function InputWithCounter(
  { currentLength, maxLength, errorMessage, ...props },
  ref
) {
  const errorId = React.useId();
  const describedBy = [
    props['aria-describedby'],
    errorMessage ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <InputGroup>
        <InputGroupInput
          {...props}
          ref={ref}
          maxLength={maxLength}
          aria-invalid={errorMessage ? true : props['aria-invalid']}
          aria-describedby={describedBy || undefined}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText aria-live="polite">
            {currentLength}/{maxLength}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      {errorMessage ? (
        <p id={errorId} className="text-destructive text-sm">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
});
