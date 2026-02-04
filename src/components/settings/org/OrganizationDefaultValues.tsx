'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrganizationDefaultValuesProps {
  helperSingular: string;
  maxParticipantsPerHelper: string;
  defaultStarttime: string;
  defaultEndtime: string;
  onMaxParticipantsPerHelperChange: (value: string) => void;
  onDefaultStarttimeChange: (value: string) => void;
  onDefaultEndtimeChange: (value: string) => void;
}

export function OrganizationDefaultValues({
  helperSingular,
  maxParticipantsPerHelper,
  defaultStarttime,
  defaultEndtime,
  onMaxParticipantsPerHelperChange,
  onDefaultStarttimeChange,
  onDefaultEndtimeChange,
}: OrganizationDefaultValuesProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
