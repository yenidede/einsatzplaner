'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface OrganizationPreferencesProps {
  helperSingular: string;
  helperPlural: string;
  einsatzSingular: string;
  einsatzPlural: string;
  allowSelfSignOut: boolean;
  onEinsatzSingularChange: (value: string) => void;
  onEinsatzPluralChange: (value: string) => void;
  onHelperSingularChange: (value: string) => void;
  onHelperPluralChange: (value: string) => void;
  onAllowSelfSignOutChange: (value: boolean) => void;
}

export function OrganizationPreferences({
  helperSingular,
  helperPlural,
  onHelperSingularChange,
  onHelperPluralChange,
  einsatzSingular,
  einsatzPlural,
  allowSelfSignOut,
  onEinsatzSingularChange,
  onEinsatzPluralChange,
  onAllowSelfSignOutChange,
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="allow-self-signout"
            checked={allowSelfSignOut}
            onCheckedChange={(checked: boolean) =>
              onAllowSelfSignOutChange(checked === true)
            }
            aria-label={`${helperPlural} können sich selbst austragen`}
          />
          <Label
            htmlFor="allow-self-signout"
            className="cursor-pointer font-medium"
          >
            {helperPlural} können sich selbst austragen
          </Label>
        </div>
        <p className="text-muted-foreground ml-6 text-sm">
          Wenn aktiviert, können sich {helperPlural} selbstständig aus{' '}
          {einsatzPlural} austragen, für die sie sich eingetragen haben.
        </p>
      </div>
    </div>
  );
}
