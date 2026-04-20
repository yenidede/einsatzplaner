'use client';

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

export function InputWithCounter({
  currentLength,
  maxLength,
  errorMessage,
  ...props
}: InputWithCounterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <InputGroup>
        <InputGroupInput
          aria-invalid={!!errorMessage}
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText aria-live="polite">
            {currentLength}/{maxLength}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      {errorMessage ? (
        <p className="text-destructive text-sm">{errorMessage}</p>
      ) : null}
    </div>
  );
}
