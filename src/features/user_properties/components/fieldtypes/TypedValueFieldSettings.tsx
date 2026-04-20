'use client';

import FormInputFieldCustom from '@/components/form/formInputFieldCustom';
import { Input } from '@/components/ui/input';

type SupportedInputType = 'text' | 'email' | 'tel' | 'date' | 'time';

interface TypedValueFieldSettingsProps {
  defaultValueInputType: SupportedInputType;
  placeholder: string;
  defaultValue?: string;
  placeholderHint: string;
  defaultValueHint: string;
  onChange: (updates: { placeholder?: string; defaultValue?: string }) => void;
}

export function TypedValueFieldSettings({
  defaultValueInputType,
  placeholder,
  defaultValue,
  placeholderHint,
  defaultValueHint,
  onChange,
}: TypedValueFieldSettingsProps) {
  return (
    <>
      <FormInputFieldCustom name="Platzhalter (optional)" errors={[]}>
        <Input
          type="text"
          value={placeholder}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder={placeholderHint}
        />
      </FormInputFieldCustom>

      <FormInputFieldCustom name="Standardwert (optional)" errors={[]}>
        <Input
          type={defaultValueInputType}
          value={defaultValue ?? ''}
          onChange={(e) => onChange({ defaultValue: e.target.value })}
          placeholder={defaultValueHint}
        />
      </FormInputFieldCustom>
    </>
  );
}
