'use client';

import FormInputFieldCustom from '@/components/form/formInputFieldCustom';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TextFieldSettingsProps {
  placeholder: string;
  maxLength?: number;
  isMultiline?: boolean;
  defaultValue?: string;
  onChange: (updates: {
    placeholder?: string;
    maxLength?: number;
    isMultiline?: boolean;
    defaultValue?: string;
  }) => void;
}

export function TextFieldSettings({
  placeholder,
  maxLength,
  isMultiline,
  defaultValue,
  onChange,
}: TextFieldSettingsProps) {
  return (
    <>
      <FormInputFieldCustom name="Platzhalter (optional)" errors={[]}>
        <Input
          value={placeholder}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="z.B. Bitte eingeben..."
        />
      </FormInputFieldCustom>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={isMultiline || false}
          onCheckedChange={(checked) =>
            onChange({ isMultiline: checked === true })
          }
          id="isMultiline"
        />
        <Label htmlFor="isMultiline" className="text-sm font-medium">
          Mehrzeilige Eingabe erlauben
        </Label>
      </div>

      <FormInputFieldCustom name="Maximale Länge (optional)" errors={[]}>
        <Input
          type="number"
          value={maxLength || ''}
          onChange={(e) =>
            onChange({
              maxLength: e.target.value
                ? parseInt(e.target.value, 10)
                : undefined,
            })
          }
          placeholder="z.B. 100"
        />
      </FormInputFieldCustom>

      <FormInputFieldCustom name="Standardwert (optional)" errors={[]}>
        <Input
          value={defaultValue || ''}
          onChange={(e) => onChange({ defaultValue: e.target.value })}
          placeholder="Wird vorausgefüllt, falls leer"
        />
      </FormInputFieldCustom>
    </>
  );
}
