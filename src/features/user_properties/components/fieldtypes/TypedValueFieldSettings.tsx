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
  showPlaceholderField?: boolean;
  onChange: (updates: { placeholder?: string; defaultValue?: string }) => void;
}

export function TypedValueFieldSettings({
  defaultValueInputType,
  placeholder,
  defaultValue,
  placeholderHint,
  defaultValueHint,
  showPlaceholderField = true,
  onChange,
}: TypedValueFieldSettingsProps) {
  return (
    <>
      {showPlaceholderField && (
        <FormInputFieldCustom name="Platzhalter (optional)" errors={[]}>
          <Input
            type="text"
            value={placeholder}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            placeholder={placeholderHint}
          />
          <p className="text-muted-foreground mt-1 text-sm">
            Wird nur als Hinweis in einem leeren Feld angezeigt und nicht
            gespeichert.
          </p>
        </FormInputFieldCustom>
      )}

      <FormInputFieldCustom name="Standardwert (optional)" errors={[]}>
        <Input
          type={defaultValueInputType}
          value={defaultValue ?? ''}
          onChange={(e) => onChange({ defaultValue: e.target.value })}
          placeholder={defaultValueHint}
        />
        <p className="text-muted-foreground mt-1 text-sm">
          Wird automatisch eingetragen und gespeichert, sofern Sie ihn nicht
          ändern.
        </p>
      </FormInputFieldCustom>
    </>
  );
}
