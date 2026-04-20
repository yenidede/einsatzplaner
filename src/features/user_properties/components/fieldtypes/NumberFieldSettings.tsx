'use client';

import FormInputFieldCustom from '@/components/form/formInputFieldCustom';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface NumberFieldSettingsProps {
  isDecimal: boolean;
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  defaultValue?: string;
  showDecimalToggle?: boolean;
  decimalToggleLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  placeholderLabel?: string;
  defaultValueLabel?: string;
  onChange: (updates: {
    isDecimal?: boolean;
    minValue?: number;
    maxValue?: number;
    placeholder?: string;
    defaultValue?: string;
  }) => void;
}

export function NumberFieldSettings({
  isDecimal,
  minValue,
  maxValue,
  placeholder,
  defaultValue,
  showDecimalToggle = true,
  decimalToggleLabel = 'Dezimalzahlen erlauben',
  minLabel = 'Minimalwert (optional)',
  maxLabel = 'Maximalwert (optional)',
  placeholderLabel = 'Platzhalter (optional)',
  defaultValueLabel = 'Standardwert (optional)',
  onChange,
}: NumberFieldSettingsProps) {
  return (
    <>
      {showDecimalToggle && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isDecimal}
            onCheckedChange={(checked) =>
              onChange({ isDecimal: checked === true })
            }
            id="isDecimal"
          />
          <Label htmlFor="isDecimal" className="text-sm font-medium">
            {decimalToggleLabel}
          </Label>
        </div>
      )}

      <FormInputFieldCustom name={minLabel} errors={[]}>
        <Input
          type="number"
          step={isDecimal ? '0.01' : '1'}
          value={minValue ?? ''}
          onChange={(e) =>
            onChange({
              minValue: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          placeholder="z.B. 0"
        />
      </FormInputFieldCustom>

      <FormInputFieldCustom name={maxLabel} errors={[]}>
        <Input
          type="number"
          step={isDecimal ? '0.01' : '1'}
          value={maxValue ?? ''}
          onChange={(e) =>
            onChange({
              maxValue: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          placeholder="z.B. 100"
        />
      </FormInputFieldCustom>

      <FormInputFieldCustom name={placeholderLabel} errors={[]}>
        <Input
          value={placeholder ?? ''}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder={isDecimal ? 'z.B. 0,00' : 'z.B. 10'}
        />
      </FormInputFieldCustom>

      <FormInputFieldCustom name={defaultValueLabel} errors={[]}>
        <Input
          type="number"
          step={isDecimal ? '0.01' : '1'}
          value={defaultValue ?? ''}
          onChange={(e) => onChange({ defaultValue: e.target.value })}
          placeholder={isDecimal ? 'z.B. 99,90' : 'z.B. 42'}
        />
      </FormInputFieldCustom>
    </>
  );
}
