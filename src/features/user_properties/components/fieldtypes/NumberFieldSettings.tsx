'use client';

import FormInputFieldCustom from '@/components/form/formInputFieldCustom';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface NumberFieldSettingsProps {
  isDecimal: boolean;
  minValue?: number;
  maxValue?: number;
  onChange: (updates: {
    isDecimal?: boolean;
    minValue?: number;
    maxValue?: number;
  }) => void;
}

export function NumberFieldSettings({
  isDecimal,
  minValue,
  maxValue,
  onChange,
}: NumberFieldSettingsProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isDecimal}
          onCheckedChange={(checked) =>
            onChange({ isDecimal: checked === true })
          }
          id="isDecimal"
        />
        <Label htmlFor="isDecimal" className="text-sm font-medium">
          Dezimalzahlen erlauben
        </Label>
      </div>

      <FormInputFieldCustom name="Minimalwert (optional)" errors={[]}>
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

      <FormInputFieldCustom name="Maximalwert (optional)" errors={[]}>
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
    </>
  );
}
