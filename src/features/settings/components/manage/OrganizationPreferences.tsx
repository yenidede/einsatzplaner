'use client';

import { Button } from '@/components/ui/button';

interface OrganizationPreferencesProps {
  helperSingular: string;
  helperPlural: string;
  einsatzSingular: string;
  einsatzPlural: string;
  maxParticipantsPerHelper: string;
  onMaxParticipantsPerHelperChange: (value: string) => void;
  onEinsatzSingularChange: (value: string) => void;
  onEinsatzPluralChange: (value: string) => void;
  onHelperSingularChange: (value: string) => void;
  onHelperPluralChange: (value: string) => void;
  onSave: () => void;
}

export function OrganizationPreferences({
  helperSingular,
  helperPlural,
  onHelperSingularChange,
  onHelperPluralChange,
  einsatzSingular,
  einsatzPlural,
  maxParticipantsPerHelper,
  onEinsatzSingularChange,
  onEinsatzPluralChange,
  onMaxParticipantsPerHelperChange,
  onSave,
}: OrganizationPreferencesProps) {
  return (
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          Präferenzen
        </div>
      </div>
      <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
        <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
          <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
            <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Helfer (Singular)
            </label>
            <input
              type="text"
              value={helperSingular}
              onChange={(e) => onHelperSingularChange(e.target.value)}
              className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
              placeholder="z.B. Vermittler:in, Helfer:in"
            />
          </div>
          <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
            <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Helfer (Plural)
            </label>
            <input
              type="text"
              value={helperPlural}
              onChange={(e) => onHelperPluralChange(e.target.value)}
              className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
              placeholder="z.B. Vermittler:innen, Helfer:innen"
            />
          </div>
        </div>
        <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
          <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
            <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Einsatz (Singular)
            </label>
            <input
              type="text"
              value={einsatzSingular}
              onChange={(e) => onEinsatzSingularChange(e.target.value)}
              className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
              placeholder="z.B. Einsatz, Schicht"
            />
          </div>
          <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
            <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Einsatz (Plural)
            </label>
            <input
              type="text"
              value={einsatzPlural}
              onChange={(e) => onEinsatzPluralChange(e.target.value)}
              className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
              placeholder="z.B. Einsätze, Schichten"
            />
          </div>
        </div>
        <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
          <div className="inline-flex flex-1 flex-col items-start justify-start gap-1.5">
            <label className="font-['Inter'] text-sm leading-tight font-medium text-slate-800">
              Maximale Teilnehmende pro {helperSingular}
            </label>
            <input
              type="number"
              value={maxParticipantsPerHelper}
              onChange={(e) => onMaxParticipantsPerHelperChange(e.target.value)}
              className="w-full rounded-md bg-white px-3 py-2 outline outline-offset-1 outline-slate-300 focus:outline-blue-500"
              placeholder="z.B. 25"
            />
          </div>
        </div>
        <Button onClick={onSave} className="mt-4">
          Änderungen speichern
        </Button>
      </div>
    </div>
  );
}
