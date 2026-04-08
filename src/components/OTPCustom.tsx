'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';

type InputMode =
  | 'text'
  | 'numeric'
  | 'decimal'
  | 'tel'
  | 'search'
  | 'email'
  | 'url';

export interface OTPCustomProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaInvalid?: boolean;
  inputMode?: InputMode;
  pattern?: RegExp;
  separatorAfter?: number[];
  className?: string;
}

function normalizeValue(
  value: string,
  pattern: RegExp,
  length: number
): string {
  return value
    .split('')
    .filter((character) => pattern.test(character))
    .join('')
    .slice(0, length);
}

export const OTPCustom = forwardRef<HTMLDivElement, OTPCustomProps>(
  (
    {
      id,
      value,
      onChange,
      length = 6,
      disabled = false,
      autoFocus = false,
      ariaInvalid = false,
      inputMode = 'numeric',
      pattern = /\d/,
      separatorAfter = [2],
      className,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement, []);

    const normalizedValue = useMemo(
      () => normalizeValue(value, pattern, length),
      [length, pattern, value]
    );

    useEffect(() => {
      if (!autoFocus || disabled) {
        return;
      }

      inputRefs.current[0]?.focus();
    }, [autoFocus, disabled]);

    const updateValueAtIndex = (index: number, nextCharacter: string) => {
      const nextValue = normalizedValue.split('');
      nextValue[index] = nextCharacter;
      const normalizedNextValue = normalizeValue(
        nextValue.join(''),
        pattern,
        length
      );

      onChange(normalizedNextValue);
    };

    const handleChange = (index: number, rawValue: string) => {
      const nextValue = normalizeValue(rawValue, pattern, length);

      if (nextValue.length === 0) {
        updateValueAtIndex(index, '');
        return;
      }

      if (nextValue.length > 1) {
        const characters = normalizedValue.split('');
        nextValue.split('').forEach((character, offset) => {
          const targetIndex = index + offset;
          if (targetIndex < length) {
            characters[targetIndex] = character;
          }
        });
        const normalizedNextValue = normalizeValue(
          characters.join(''),
          pattern,
          length
        );

        onChange(normalizedNextValue);
        const focusIndex = Math.min(index + nextValue.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
        return;
      }

      updateValueAtIndex(index, nextValue);

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handleKeyDown = (
      index: number,
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (event.key === 'Backspace') {
        if (normalizedValue[index]) {
          updateValueAtIndex(index, '');
          return;
        }

        if (index > 0) {
          updateValueAtIndex(index - 1, '');
          inputRefs.current[index - 1]?.focus();
        }
      }

      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }

      if (event.key === 'ArrowRight' && index < length - 1) {
        event.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pastedValue = event.clipboardData.getData('text');
      const normalizedNextValue = normalizeValue(pastedValue, pattern, length);

      onChange(normalizedNextValue);
      const lastIndex = Math.min(
        normalizedNextValue.length,
        length - 1
      );
      inputRefs.current[lastIndex]?.focus();
    };

    return (
      <div
        ref={containerRef}
        className={cn('flex items-center gap-2', className)}
        data-slot="otp-custom"
      >
        {Array.from({ length }, (_, index) => {
          const hasSeparator = separatorAfter.includes(index) && index < length;

          return (
            <div
              className="flex items-center gap-2"
              key={`${id ?? 'otp'}-${index}`}
            >
              <input
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                aria-invalid={ariaInvalid}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                className={cn(
                  'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex size-10 items-center justify-center rounded-md border text-center text-base font-medium transition outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                  normalizedValue[index] ? 'shadow-xs' : ''
                )}
                data-otp-index={index}
                disabled={disabled}
                id={index === 0 ? id : undefined}
                inputMode={inputMode}
                maxLength={1}
                type="text"
                value={normalizedValue[index] ?? ''}
                onChange={(event) => {
                  handleChange(index, event.target.value);
                }}
                onKeyDown={(event) => {
                  handleKeyDown(index, event);
                }}
                onPaste={handlePaste}
              />
              {hasSeparator ? (
                <div
                  aria-hidden="true"
                  className="text-muted-foreground flex items-center text-sm"
                >
                  -
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
);

OTPCustom.displayName = 'OTPCustom';
