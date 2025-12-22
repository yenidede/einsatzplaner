"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface UsageSettingsProps {
  isRequired: boolean;
  onChange: (updates: { isRequired?: boolean }) => void;
  warningMessage?: string | null;
}

export function UsageSettings({
  isRequired,
  onChange,
  warningMessage,
}: UsageSettingsProps) {
  return (
    <div className="self-stretch px-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Eingabe-Regeln für Personen
      </h3>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isRequired}
            onCheckedChange={(checked) =>
              onChange({ isRequired: checked === true })
            }
            id="isRequired"
          />
          <Label htmlFor="isRequired" className="text-sm font-medium">
            Muss bei jeder Person ausgefüllt sein
          </Label>
        </div>

        {warningMessage && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{warningMessage}</p>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
          <p className="text-xs text-slate-600">
            Diese Eigenschaft beschreibt Personen und kann später in anderen
            Modulen (z. B. Filtersuche) genutzt werden.
          </p>
        </div>
      </div>
    </div>
  );
}
