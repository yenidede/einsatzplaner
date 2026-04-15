'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { de } from 'date-fns/locale';
import { parseISO } from 'date-fns';

import { cn } from '@/lib/utils';
import {
  formatDateInputDisplay,
  formatDateInputValue,
  parseDateInputText,
  parseDateRangeInputText,
} from '@/lib/date-input';
import { Calendar } from '@/components/ui/calendar';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type DateInputRangeValue = {
  from: string;
  to: string;
} | null;

type CommonProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  'type' | 'value' | 'onChange'
> & {
  className?: string;
  inputClassName?: string;
  invalidMessage?: string;
  allowEmpty?: boolean;
};

type SingleDateInputProps = CommonProps & {
  mode?: 'single';
  value: string;
  onValueChange: (value: string) => void;
};

type RangeDateInputProps = CommonProps & {
  mode: 'range';
  value: DateInputRangeValue;
  onValueChange: (value: DateInputRangeValue) => void;
};

type DateInputProps = SingleDateInputProps | RangeDateInputProps;

function serializeRangeValue(value: DateInputRangeValue): string {
  if (!value) {
    return '';
  }

  return `${value.from}__${value.to}`;
}

function formatSingleValueForInput(value: string): string {
  if (value.trim() === '') {
    return '';
  }

  const parsed = parseDateInputText(value);
  return parsed ? formatDateInputDisplay(parsed) : value;
}

function formatRangeValueForInput(value: DateInputRangeValue): string {
  if (!value) {
    return '';
  }

  const fromDate = parseISO(value.from);
  const toDate = parseISO(value.to);

  if (Number.isNaN(fromDate.getTime()) && Number.isNaN(toDate.getTime())) {
    return '';
  }

  if (Number.isNaN(toDate.getTime())) {
    return formatDateInputDisplay(fromDate);
  }

  if (Number.isNaN(fromDate.getTime())) {
    return formatDateInputDisplay(toDate);
  }

  return `${formatDateInputDisplay(fromDate)} – ${formatDateInputDisplay(
    toDate
  )}`;
}

function getSingleCalendarDate(value: string): Date | undefined {
  const parsed = parseDateInputText(value);
  return parsed ?? undefined;
}

function getRangeCalendarSelection(value: DateInputRangeValue):
  | {
      from: Date | undefined;
      to: Date | undefined;
    }
  | undefined {
  if (!value) {
    return undefined;
  }

  return {
    from: parseISO(value.from),
    to: parseISO(value.to),
  };
}

const RangeDateInput = React.forwardRef<HTMLInputElement, RangeDateInputProps>(
  function RangeDateInput(
    {
      value,
      onValueChange,
      className,
      inputClassName,
      invalidMessage,
      allowEmpty = true,
      onBlur,
      onKeyDown,
      placeholder,
      disabled,
      ...inputProps
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const [draftValue, setDraftValue] = React.useState(() =>
      formatRangeValueForInput(value)
    );
    const [localError, setLocalError] = React.useState<string | null>(null);
    const pendingRangeSelectionRef = React.useRef(false);
    const lastCommittedValueRef = React.useRef(serializeRangeValue(value));

    const syncDraftValue = React.useEffectEvent(() => {
      setDraftValue(formatRangeValueForInput(value));
      setLocalError(null);
      pendingRangeSelectionRef.current = false;
    });

    React.useEffect(() => {
      const nextCommittedValue = serializeRangeValue(value);
      if (lastCommittedValueRef.current === nextCommittedValue) {
        return;
      }

      lastCommittedValueRef.current = nextCommittedValue;
      syncDraftValue();
    }, [syncDraftValue, value]);

    const handleOpenChange = React.useCallback(
      (nextOpen: boolean) => {
        if (!nextOpen && pendingRangeSelectionRef.current) {
          syncDraftValue();
        }

        setOpen(nextOpen);
      },
      [syncDraftValue]
    );

    const commitRangeValue = React.useCallback(() => {
      if (draftValue.trim() === '') {
        if (allowEmpty) {
          setLocalError(null);
          lastCommittedValueRef.current = '';
          if (value !== null) {
            onValueChange(null);
          }
          return;
        }

        setLocalError(
          invalidMessage ?? 'Bitte geben Sie einen gültigen Zeitraum ein.'
        );
        return;
      }

      const parsedRange = parseDateRangeInputText(draftValue);

      if (!parsedRange) {
        setLocalError(
          invalidMessage ?? 'Bitte geben Sie einen gültigen Zeitraum ein.'
        );
        return;
      }

      const nextValue = {
        from: formatDateInputValue(parsedRange.from),
        to: formatDateInputValue(parsedRange.to),
      };
      const nextDraftValue = `${formatDateInputDisplay(
        parsedRange.from
      )} – ${formatDateInputDisplay(parsedRange.to)}`;
      const nextSerializedValue = serializeRangeValue(nextValue);
      const currentSerializedValue = serializeRangeValue(value);

      setDraftValue(nextDraftValue);
      setLocalError(null);
      lastCommittedValueRef.current = nextSerializedValue;
      pendingRangeSelectionRef.current = false;

      if (nextSerializedValue !== currentSerializedValue) {
        onValueChange(nextValue);
      }
    }, [allowEmpty, draftValue, invalidMessage, onValueChange, value]);

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <InputGroup className={cn('w-full', inputClassName)}>
            <InputGroupInput
              ref={ref}
              {...inputProps}
              disabled={disabled}
              type="text"
              inputMode="numeric"
              data-slot="date-input"
              placeholder={placeholder ?? 'Zeitraum eingeben...'}
              value={draftValue}
              aria-invalid={Boolean(
                localError !== null || inputProps['aria-invalid']
              )}
              onChange={(event) => {
                setDraftValue(event.target.value);
                if (localError !== null) {
                  setLocalError(null);
                }
              }}
              onBlur={(event) => {
                if (pendingRangeSelectionRef.current) {
                  onBlur?.(event);
                  return;
                }

                commitRangeValue();
                onBlur?.(event);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }

                onKeyDown?.(event);
              }}
            />
            <InputGroupAddon align="inline-end">
              <PopoverTrigger asChild>
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  disabled={disabled}
                  aria-label="Kalender für Zeitraum öffnen"
                >
                  <CalendarIcon data-icon="inline-end" aria-hidden="true" />
                </InputGroupButton>
              </PopoverTrigger>
            </InputGroupAddon>
          </InputGroup>
          <PopoverContent align="start" sideOffset={8} className="w-auto p-3">
            <Calendar
              locale={de}
              showOutsideDays
              mode="range"
              selected={getRangeCalendarSelection(value) ?? undefined}
              defaultMonth={
                getRangeCalendarSelection(value)?.from ??
                getRangeCalendarSelection(value)?.to ??
                new Date()
              }
              numberOfMonths={2}
              onSelect={(selected) => {
                if (!selected || !selected.from) {
                  if (!allowEmpty) {
                    return;
                  }

                  pendingRangeSelectionRef.current = false;
                  setDraftValue('');
                  onValueChange(null);
                  setOpen(false);
                  return;
                }

                if (!selected.to) {
                  pendingRangeSelectionRef.current = true;
                  setDraftValue(formatDateInputDisplay(selected.from));
                  return;
                }

                const nextValue = {
                  from: formatDateInputValue(selected.from),
                  to: formatDateInputValue(selected.to),
                };

                pendingRangeSelectionRef.current = false;
                setDraftValue(
                  `${formatDateInputDisplay(selected.from)} – ${formatDateInputDisplay(
                    selected.to
                  )}`
                );
                onValueChange(nextValue);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {localError ? (
          <p className="text-destructive text-sm" aria-live="polite">
            {localError}
          </p>
        ) : null}
      </div>
    );
  }
);

const SingleDateInput = React.forwardRef<HTMLInputElement, SingleDateInputProps>(
  function SingleDateInput(
    {
      value,
      onValueChange,
      className,
      inputClassName,
      invalidMessage,
      allowEmpty = true,
      onBlur,
      onKeyDown,
      placeholder,
      disabled,
      ...inputProps
    },
    ref
  ) {
    const [open, setOpen] = React.useState(false);
    const [draftValue, setDraftValue] = React.useState(() =>
      formatSingleValueForInput(value)
    );
    const [localError, setLocalError] = React.useState<string | null>(null);
    const lastCommittedValueRef = React.useRef(value);

    const syncDraftValue = React.useEffectEvent(() => {
      setDraftValue(formatSingleValueForInput(value));
      setLocalError(null);
    });

    React.useEffect(() => {
      const nextCommittedValue = value;
      if (lastCommittedValueRef.current === nextCommittedValue) {
        return;
      }

      lastCommittedValueRef.current = nextCommittedValue;
      syncDraftValue();
    }, [syncDraftValue, value]);

    const handleOpenChange = React.useCallback(
      (nextOpen: boolean) => {
        setOpen(nextOpen);
      },
      []
    );

    const commitSingleValue = React.useCallback(() => {
      if (draftValue.trim() === '') {
        if (allowEmpty) {
          setLocalError(null);
          lastCommittedValueRef.current = '';
          if (value !== '') {
            onValueChange('');
          }
          return;
        }

        setLocalError(
          invalidMessage ?? 'Bitte geben Sie ein gültiges Datum ein.'
        );
        return;
      }

      const parsedDate = parseDateInputText(draftValue);

      if (!parsedDate) {
        setLocalError(
          invalidMessage ?? 'Bitte geben Sie ein gültiges Datum ein.'
        );
        return;
      }

      const nextValue = formatDateInputValue(parsedDate);
      const nextDraftValue = formatDateInputDisplay(parsedDate);

      setDraftValue(nextDraftValue);
      setLocalError(null);
      lastCommittedValueRef.current = nextValue;

      if (nextValue !== value) {
        onValueChange(nextValue);
      }
    }, [allowEmpty, draftValue, invalidMessage, onValueChange, value]);

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <InputGroup className={cn('w-full', inputClassName)}>
            <InputGroupInput
              ref={ref}
              {...inputProps}
              disabled={disabled}
              type="text"
              inputMode="numeric"
              data-slot="date-input"
              placeholder={placeholder ?? 'Datum eingeben...'}
              value={draftValue}
              aria-invalid={Boolean(
                localError !== null || inputProps['aria-invalid']
              )}
              onChange={(event) => {
                setDraftValue(event.target.value);
                if (localError !== null) {
                  setLocalError(null);
                }
              }}
              onBlur={(event) => {
                commitSingleValue();
                onBlur?.(event);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }

                onKeyDown?.(event);
              }}
            />
            <InputGroupAddon align="inline-end">
              <PopoverTrigger asChild>
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  disabled={disabled}
                  aria-label="Kalender für Datum öffnen"
                >
                  <CalendarIcon data-icon="inline-end" aria-hidden="true" />
                </InputGroupButton>
              </PopoverTrigger>
            </InputGroupAddon>
          </InputGroup>
          <PopoverContent align="start" sideOffset={8} className="w-auto p-2">
            <Calendar
              locale={de}
              showOutsideDays
              mode="single"
              selected={getSingleCalendarDate(value) ?? undefined}
              defaultMonth={getSingleCalendarDate(value) ?? new Date()}
              onSelect={(selected) => {
                if (!selected) {
                  if (!allowEmpty) {
                    return;
                  }

                  setDraftValue('');
                  onValueChange('');
                  setOpen(false);
                  return;
                }

                const nextValue = formatDateInputValue(selected);

                setDraftValue(formatDateInputDisplay(selected));
                onValueChange(nextValue);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {localError ? (
          <p className="text-destructive text-sm" aria-live="polite">
            {localError}
          </p>
        ) : null}
      </div>
    );
  }
);

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(props: DateInputProps, ref) {
    if (props.mode === 'range') {
      return <RangeDateInput ref={ref} {...props} />;
    }

    return <SingleDateInput ref={ref} {...props} />;
  }
);

DateInput.displayName = 'DateInput';
