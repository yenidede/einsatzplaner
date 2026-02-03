'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

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
    <div className="flex flex-col gap-4 self-stretch">
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
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{warningMessage}</p>
          </div>
        )}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            Diese Eigenschaft beschreibt Personen und kann später in anderen
            Modulen (z. B. Filtersuche) genutzt werden.
          </p>
        </div>
      </div>
    </div>
  );
}
