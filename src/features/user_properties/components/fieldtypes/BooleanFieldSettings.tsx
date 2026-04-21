'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BooleanFieldSettingsProps {
  trueLabel: string;
  falseLabel: string;
  booleanDefaultValue?: boolean | null;
  onChange: (updates: {
    trueLabel?: string;
    falseLabel?: string;
    booleanDefaultValue?: boolean | null;
  }) => void;
}

export function BooleanFieldSettings({
  trueLabel,
  falseLabel,
  booleanDefaultValue,
  onChange,
}: BooleanFieldSettingsProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Standardwert (optional)</Label>
        <p className="text-muted-foreground text-sm">
          Wird automatisch ausgewählt und gespeichert, sofern Sie ihn nicht
          ändern.
        </p>
        <div className="flex gap-4">
          <RadioGroup
            value={
              booleanDefaultValue === true
                ? 'true'
                : booleanDefaultValue === false
                  ? 'false'
                  : 'none'
            }
            onValueChange={(value) =>
              onChange({
                booleanDefaultValue:
                  value === 'true' ? true : value === 'false' ? false : null,
              })
            }
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">Kein Standardwert</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true">{trueLabel}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false">{falseLabel}</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </>
  );
}
