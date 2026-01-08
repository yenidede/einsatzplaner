'use client';

import { Switch } from '@/features/settings/components/ui/switch';
import { Label } from '@/features/settings/components/ui/label';
import { LabelSettings } from '@/features/settings/components/ui/LabelSettings';
import { Salutation } from '../../types';

interface PersonalPreferencesSectionProps {
  showLogos: boolean;
  salutationId: string;
  salutations: Salutation[];
  onShowLogosChange: (value: boolean) => void;
  onSalutationChange: (value: string) => void;
}

export function PersonalPreferencesSection({
  showLogos,
  salutationId,
  salutations,
  onShowLogosChange,
  onSalutationChange,
}: PersonalPreferencesSectionProps) {
  return (
    <div className="flex flex-col items-start justify-center self-stretch">
      <div className="inline-flex items-center justify-between self-stretch border-b border-slate-200 px-4 py-2">
        <div className="flex flex-1 items-center justify-start gap-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
            Persönliche Präferenzen
          </div>
        </div>
      </div>

      <div className="inline-flex items-start justify-start gap-4 self-stretch py-2">
        <div className="flex flex-1 items-start justify-start gap-4 px-4">
          <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
            <div className="justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Zeige Logos in Kalenderansicht
            </div>
            <div className="inline-flex items-center gap-2">
              <Switch
                id="logo-switch"
                checked={showLogos}
                onCheckedChange={onShowLogosChange}
                aria-label="Toggle switch"
              />
              <Label htmlFor="logo-switch" className="text-sm font-medium">
                {showLogos ? 'On' : 'Off'}
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="inline-flex items-start justify-start gap-4 self-stretch py-2">
        <div className="flex flex-1 items-start justify-start gap-4 px-4">
          <div className="inline-flex min-w-72 flex-1 flex-col items-start justify-start gap-1.5">
            <LabelSettings htmlFor="salutation" className="text-sm font-medium">
              Anrede
            </LabelSettings>
            <select
              id="salutation"
              value={salutationId || ''}
              onChange={(e) => onSalutationChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              <option value="">Bitte wählen</option>
              {salutations.map((sal) => (
                <option key={sal.id} value={sal.id}>
                  {sal.salutation}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
