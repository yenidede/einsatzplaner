'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="helper-singular">Helfer (Singular)</Label>
          <Input
            id="helper-singular"
            type="text"
            value={helperSingular}
            onChange={(e) => onHelperSingularChange(e.target.value)}
            placeholder="z.B. Vermittler:in, Helfer:in"
            aria-label="Helfer Singular"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="helper-plural">Helfer (Plural)</Label>
          <Input
            id="helper-plural"
            type="text"
            value={helperPlural}
            onChange={(e) => onHelperPluralChange(e.target.value)}
            placeholder="z.B. Vermittler:innen, Helfer:innen"
            aria-label="Helfer Plural"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="einsatz-singular">Einsatz (Singular)</Label>
          <Input
            id="einsatz-singular"
            type="text"
            value={einsatzSingular}
            onChange={(e) => onEinsatzSingularChange(e.target.value)}
            placeholder="z.B. Einsatz, Schicht"
            aria-label="Einsatz Singular"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="einsatz-plural">Einsatz (Plural)</Label>
          <Input
            id="einsatz-plural"
            type="text"
            value={einsatzPlural}
            onChange={(e) => onEinsatzPluralChange(e.target.value)}
            placeholder="z.B. Einsätze, Schichten"
            aria-label="Einsatz Plural"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="max-participants">
          Maximale Teilnehmende pro {helperSingular}
        </Label>
        <Input
          id="max-participants"
          type="number"
          value={maxParticipantsPerHelper}
          onChange={(e) => onMaxParticipantsPerHelperChange(e.target.value)}
          placeholder="z.B. 25"
          aria-label={`Maximale Teilnehmende pro ${helperSingular}`}
          min="0"
        />
      </div>
    </div>
  );
}
