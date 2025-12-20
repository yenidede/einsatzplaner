"use client";

import FormInputFieldCustom from "@/components/form/formInputFieldCustom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface BooleanFieldSettingsProps {
  trueLabel: string;
  falseLabel: string;
  defaultValue?: boolean | null;
  onChange: (updates: {
    trueLabel?: string;
    falseLabel?: string;
    booleanDefaultValue?: boolean | null;
  }) => void;
}

export function BooleanFieldSettings({
  trueLabel,
  falseLabel,
  onChange,
}: BooleanFieldSettingsProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Standardwert (optional)</Label>
        <div className="flex gap-4">
          <RadioGroup>
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
