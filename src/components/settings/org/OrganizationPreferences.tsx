'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface OrganizationPreferencesProps {
  helperSingular: string;
  helperPlural: string;
  einsatzSingular: string;
  einsatzPlural: string;
  maxParticipantsPerHelper: string;
  defaultStarttime: string;
  defaultEndtime: string;
  allowSelfSignOut: boolean;
  onMaxParticipantsPerHelperChange: (value: string) => void;
  onDefaultStarttimeChange: (value: string) => void;
  onDefaultEndtimeChange: (value: string) => void;
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
  maxParticipantsPerHelper,
  defaultStarttime,
  defaultEndtime,
  allowSelfSignOut,
  onEinsatzSingularChange,
  onEinsatzPluralChange,
  onMaxParticipantsPerHelperChange,
  onDefaultStarttimeChange,
  onDefaultEndtimeChange,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="default-starttime">Standard-Startzeit</Label>
          <Input
            id="default-starttime"
            type="time"
            value={defaultStarttime}
            onChange={(e) => onDefaultStarttimeChange(e.target.value)}
            aria-label="Standard-Startzeit für neue Einsätze"
          />
          <p className="text-muted-foreground text-sm">
            Wird im Einsatz-Dialog als Vorgabe für die Startzeit verwendet.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="default-endtime">Standard-Endzeit</Label>
          <Input
            id="default-endtime"
            type="time"
            value={defaultEndtime}
            onChange={(e) => onDefaultEndtimeChange(e.target.value)}
            aria-label="Standard-Endzeit für neue Einsätze"
          />
          <p className="text-muted-foreground text-sm">
            Wird im Einsatz-Dialog als Vorgabe für die Endzeit verwendet.
          </p>
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
