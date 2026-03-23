'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  onClose: () => void;
}

const variables = {
  Organisation: [
    'organization.name',
    'organization.email',
    'organization.phone',
    'organization.signatureName',
    'organization.signatureRole',
  ],
  Einsatz: [
    'assignment.groupName',
    'assignment.programName',
    'assignment.formattedDate',
    'assignment.formattedTimeRange',
    'assignment.formattedDateTimeRange',
    'assignment.participantSummary',
    'assignment.priceSummary',
  ],
};

export function VariablePicker({ onSelect, onClose }: VariablePickerProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Variable auswählen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(variables).map(([category, vars]) => (
            <div key={category}>
              <h3 className="font-bold">{category}</h3>
              <div className="grid grid-cols-2 gap-2">
                {vars.map((variable) => (
                  <Button
                    key={variable}
                    variant="outline"
                    onClick={() => {
                      onSelect(variable);
                      onClose();
                    }}
                  >
                    {variable}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
